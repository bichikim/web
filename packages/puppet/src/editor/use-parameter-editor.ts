import type {
  ParameterEditorResult,
  UseParameterEditorProps,
} from './internal/parameter-editor/types'
export type {ParameterEditorResult} from './internal/parameter-editor/types'
import {useInfluencePreview} from './internal/use-influence-preview'
import {setParameterInfluences} from './internal/parameter-influences'
import {type Accessor, batch, createEffect, createMemo, createSignal, type Setter} from 'solid-js'

import {
  getDefaultParameterValueMap,
  getParameterBindingValueMap,
  getParameterBindingValues,
  mapParameterTuple,
  MAX_PARAMETER_DIMENSIONS,
  type ParameterDimensions,
  parameterValuesEqual,
  type PuppetParameterValueMap,
  type PuppetParameterValues,
} from '../deformation'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterInfluence,
} from '../player/document'
import {resolveParameterValue} from '../player/parameter-value'
import {
  addParameter,
  addThreeDimensionalParameter,
  addTwoDimensionalParameter,
  connectParameterNodes,
  deleteParameter,
  deleteParameterKeyform,
  deleteParameterKeyformPlane,
  disconnectParameterNodes,
  getBindingParameters,
  getDefaultParameterValues,
  getDocumentParameterBindings,
  getParameterBindingsForNodeIds,
  getParameterTargetNodeIds,
  insertParameterKeyform,
  moveParameterKeyform,
  renameParameter,
} from './internal/parameter-keyforms'
import {getParameterPresentation} from './internal/parameter-presentation'
import {mirrorKeyform, type MirrorKeyformSettings} from './internal/mirror-keyform'
import {
  type CornerKeyformSettings,
  generateCornerKeyforms,
} from './internal/generate-corner-keyforms'

const getDefaultKeyformValues = (
  document: PuppetDocument,
  binding: PuppetParameterBinding | undefined,
  parameterValues?: PuppetParameterValueMap,
) => {
  const values =
    binding === undefined
      ? getDefaultParameterValues(document, binding)
      : getParameterBindingValues({binding, document, parameterValues})
  return binding?.keyforms.some((keyform) => parameterValuesEqual(keyform.values, values)) === true
    ? values
    : null
}

const formatValues = (values: PuppetParameterValues) =>
  values.map((value) => value.toFixed(2)).join(', ')

type ParameterConnectionOperation = 'connect' | 'disconnect'

const updateParameterConnection = (
  props: UseParameterEditorProps,
  binding: PuppetParameterBinding,
  operation: ParameterConnectionOperation,
) => {
  const nodeIds = props.selectedNodeIds()
  if (nodeIds.length === 0) {
    return
  }

  const document =
    operation === 'connect'
      ? connectParameterNodes({bindingId: binding.id, document: props.document(), nodeIds})
      : disconnectParameterNodes({bindingId: binding.id, document: props.document(), nodeIds})

  if (document !== undefined) {
    props.onDocumentChange(document)
    props.onNotice(null)
  }
}

interface ParameterSelectionSetters {
  readonly activeBindingId: Setter<string | null>
  readonly activeKeyformValues: Setter<PuppetParameterValues | null>
}

interface ParameterSelectionSyncOptions {
  readonly activeBindingId: Accessor<string | null>
  readonly parameterValueMap: Accessor<PuppetParameterValueMap>
  readonly props: UseParameterEditorProps
  readonly setters: ParameterSelectionSetters
}

const selectBindingState = (
  document: PuppetDocument,
  binding: PuppetParameterBinding | undefined,
  parameterValues: PuppetParameterValueMap,
  setters: ParameterSelectionSetters,
) => {
  batch(() => {
    setters.activeBindingId(binding?.id ?? null)
    setters.activeKeyformValues(getDefaultKeyformValues(document, binding, parameterValues))
  })
}

/** Connects or disconnects the selection with the active binding, if any. */
const createConnectionHandler =
  (
    props: UseParameterEditorProps,
    activeBinding: Accessor<PuppetParameterBinding | undefined>,
    operation: ParameterConnectionOperation,
  ) =>
  () => {
    const binding = activeBinding()
    if (binding !== undefined) {
      updateParameterConnection(props, binding, operation)
    }
  }

const getSelectableBindings = (
  document: PuppetDocument,
  candidates: ReadonlyArray<PuppetParameterBinding>,
) => {
  const visibleIds = new Set(
    getParameterPresentation(document, candidates).bindings.map((binding) => binding.id),
  )
  return candidates.filter((binding) => visibleIds.has(binding.id))
}

const createParameterSelectionSync = (
  options: ParameterSelectionSyncOptions,
  allParametersVisible: Accessor<boolean>,
) => {
  createEffect(() => {
    const document = options.props.document()
    const candidates = allParametersVisible()
      ? getDocumentParameterBindings(document)
      : getParameterBindingsForNodeIds(document, options.props.selectedNodeIds())
    const bindings = getSelectableBindings(document, candidates)
    const currentBindingId = options.activeBindingId()

    if (bindings.some((binding) => binding.id === currentBindingId)) {
      return
    }

    selectBindingState(document, bindings[0], options.parameterValueMap(), options.setters)
  })
}

const PARAMETER_DIMENSIONS: ReadonlyArray<ParameterDimensions> = [1, 2, MAX_PARAMETER_DIMENSIONS]

const createParameterBindingHandler =
  (
    props: UseParameterEditorProps,
    parameterValueMap: Accessor<PuppetParameterValueMap>,
    setters: ParameterSelectionSetters,
    dimension: ParameterDimensions,
  ) =>
  () => {
    const nodeIds = props.selectedNodeIds()
    if (nodeIds.length === 0) {
      props.onNotice('Parameter를 연결할 파츠나 자유 변형 디포머를 먼저 선택하세요.')
      return
    }

    const add = [addParameter, addTwoDimensionalParameter, addThreeDimensionalParameter][
      dimension - 1
    ]!
    const result = add({document: props.document(), nodeIds})
    if (result !== undefined) {
      props.onDocumentChange(result.document)
      selectBindingState(result.document, result.binding, parameterValueMap(), setters)
      props.onNotice(null)
    }
  }

const createKeyformRemovalHandler =
  (
    props: UseParameterEditorProps,
    activeBinding: Accessor<PuppetParameterBinding | undefined>,
    activeKeyformValues: Accessor<PuppetParameterValues | null>,
    setActiveKeyformValues: Setter<PuppetParameterValues | null>,
  ) =>
  () => {
    const binding = activeBinding()
    const values = activeKeyformValues()
    if (binding === undefined || values === null) {
      return
    }

    const document = deleteParameterKeyform({
      bindingId: binding.id,
      document: props.document(),
      values,
    })
    if (document !== undefined) {
      props.onDocumentChange(document)
      setActiveKeyformValues(null)
      props.onNotice(null)
    }
  }

const createPlaneRemovalHandler =
  (
    props: UseParameterEditorProps,
    activeBinding: Accessor<PuppetParameterBinding | undefined>,
    setActiveKeyformValues: Setter<PuppetParameterValues | null>,
  ) =>
  (value: number) => {
    const binding = activeBinding()
    const document =
      binding === undefined
        ? undefined
        : deleteParameterKeyformPlane({bindingId: binding.id, document: props.document(), value})
    if (document !== undefined) {
      props.onDocumentChange(document)
      setActiveKeyformValues(null)
      props.onNotice(null)
    }
  }

interface CreateParameterValueHandlerOptions {
  readonly activeBinding: Accessor<PuppetParameterBinding | undefined>
  readonly props: UseParameterEditorProps
  readonly setActiveKeyformValues: Setter<PuppetParameterValues | null>
  readonly setParameterValueMap: Setter<PuppetParameterValueMap>
}

const createParameterValueHandler = (options: CreateParameterValueHandlerOptions) =>
  function updateValues(values: PuppetParameterValues) {
    const binding = options.activeBinding()
    if (binding === undefined || values.length !== binding.parameterIds.length) {
      return
    }

    const parameters = getBindingParameters(options.props.document(), binding)
    const nextValues = mapParameterTuple(values, (value, index) => {
      const parameter = parameters[index]
      return parameter === undefined ? 0 : resolveParameterValue(parameter, value)
    })
    batch(() => {
      options.props.onBindingActivate?.(binding.id)
      options.setParameterValueMap((currentValues) => ({
        ...currentValues,
        ...getParameterBindingValueMap(binding, nextValues),
      }))
      options.setActiveKeyformValues(
        binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, nextValues))
          ? nextValues
          : null,
      )
    })
  }

interface CreateKeyformMoveHandlerOptions extends CreateParameterValueHandlerOptions {
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice: Setter<string | null>
}

const createKeyformMoveHandler =
  (options: CreateKeyformMoveHandlerOptions) =>
  (values: PuppetParameterValues, nextValues: PuppetParameterValues) => {
    const binding = options.activeBinding()
    if (binding === undefined || parameterValuesEqual(values, nextValues)) {
      return
    }

    if (binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, nextValues))) {
      options.onNotice(`${formatValues(nextValues)} 값에는 이미 키폼이 있습니다.`)
      return
    }

    const document = moveParameterKeyform({
      bindingId: binding.id,
      document: options.props.document(),
      nextValues,
      values,
    })
    if (document !== undefined) {
      options.onDocumentChange(document)
      options.setParameterValueMap((currentValues) => ({
        ...currentValues,
        ...getParameterBindingValueMap(binding, nextValues),
      }))
      options.setActiveKeyformValues(nextValues)
      options.onNotice(null)
    }
  }

interface CreateKeyformInsertionHandlerOptions {
  readonly activeBinding: Accessor<PuppetParameterBinding | undefined>
  readonly parameterValues: Accessor<PuppetParameterValues>
  readonly props: UseParameterEditorProps
  readonly setActiveKeyformValues: Setter<PuppetParameterValues | null>
}

const createKeyformInsertionHandler = (options: CreateKeyformInsertionHandlerOptions) => () => {
  const binding = options.activeBinding()
  const values = options.parameterValues()
  if (binding === undefined) {
    return
  }

  if (binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, values))) {
    options.setActiveKeyformValues(values)
    options.props.onNotice('현재 값에는 이미 키폼이 있습니다.')
    return
  }

  const document = insertParameterKeyform({
    bindingId: binding.id,
    document: options.props.document(),
    values,
  })
  if (document !== undefined) {
    options.props.onDocumentChange(document)
    options.setActiveKeyformValues(values)
    options.props.onNotice(null)
  }
}

const applyInfluences = (
  props: UseParameterEditorProps,
  binding: PuppetParameterBinding | undefined,
  influences: ReadonlyArray<PuppetParameterInfluence>,
): boolean => {
  if (binding === undefined) {
    return false
  }
  const document = setParameterInfluences({
    bindingId: binding.id,
    document: props.document(),
    influences,
  })
  if (document === undefined) {
    return false
  }
  props.onDocumentChange(document)
  props.onNotice(null)
  return true
}

const applyParameterName = (
  props: UseParameterEditorProps,
  bindingId: string | null,
  parameterId: string,
  name: string,
) => {
  if (bindingId === null) {
    return
  }
  const document = renameParameter({bindingId, document: props.document(), name, parameterId})
  if (document !== undefined) {
    props.onDocumentChange(document)
  }
}

interface KeyformGenerationHandlersOptions {
  readonly props: UseParameterEditorProps
  readonly activeBinding: Accessor<PuppetParameterBinding | undefined>
  readonly activeKeyformValues: Accessor<PuppetParameterValues | null>
  readonly parameterValues: Accessor<PuppetParameterValues>
  readonly updateValues: (values: PuppetParameterValues) => void
}

const createKeyformGenerationHandlers = (options: KeyformGenerationHandlersOptions) => {
  const {props, activeBinding, activeKeyformValues, updateValues} = options
  return {
    generateCorners(settings: CornerKeyformSettings) {
      const binding = activeBinding()
      if (binding === undefined) {
        return '2차원 이상 파라미터를 선택하세요.'
      }
      const result = generateCornerKeyforms({
        ...settings,
        bindingId: binding.id,
        document: props.document(),
        plane: (activeKeyformValues() ?? options.parameterValues())[2],
      })
      if (!result.ok) {
        return result.message
      }
      props.onDocumentChange(result.document)
      props.onNotice(null)
      return null
    },
    mirrorKeyform(settings: MirrorKeyformSettings) {
      const binding = activeBinding()
      const values = activeKeyformValues()
      if (binding === undefined || values === null) {
        return '반전할 키폼을 선택하세요.'
      }
      const result = mirrorKeyform({
        ...settings,
        bindingId: binding.id,
        document: props.document(),
        values,
      })
      if (!result.ok) {
        return result.message
      }
      props.onDocumentChange(result.document)
      updateValues(result.values)
      props.onNotice(null)
      return null
    },
  }
}

const createVisibilityHandler =
  (
    props: UseParameterEditorProps,
    activeBindingId: Accessor<string | null>,
    setVisible: Setter<boolean>,
  ): Setter<boolean> =>
  (next) => {
    const visible = setVisible(next)
    const bindingId = activeBindingId()
    if (bindingId !== null) {
      props.onBindingActivate?.(bindingId)
    }
    return visible
  }

const createBindingSelectionHandler =
  (
    props: UseParameterEditorProps,
    parameterValueMap: Accessor<PuppetParameterValueMap>,
    setters: ParameterSelectionSetters,
  ) =>
  (bindingId: string) => {
    const document = props.document()
    const binding = getDocumentParameterBindings(document).find(
      (candidate) => candidate.id === bindingId,
    )
    if (binding !== undefined) {
      selectBindingState(document, binding, parameterValueMap(), setters)
      props.onBindingActivate?.(bindingId)
    }
  }

export const useParameterEditor = (props: UseParameterEditorProps): ParameterEditorResult => {
  const [initialBinding] = getSelectableBindings(
    props.document(),
    getDocumentParameterBindings(props.document()),
  )
  const [activeBindingId, setActiveBindingId] = createSignal<string | null>(
    initialBinding?.id ?? null,
  )
  const [parameterValueMap, setParameterValueMap] = createSignal<PuppetParameterValueMap>(
    getDefaultParameterValueMap(props.document()),
  )
  const [activeKeyformValues, setActiveKeyformValues] = createSignal<PuppetParameterValues | null>(
    getDefaultKeyformValues(props.document(), initialBinding, parameterValueMap()),
  )
  const [allParametersVisible, setAllParametersVisible] = createSignal(false)
  const setters = {activeBindingId: setActiveBindingId, activeKeyformValues: setActiveKeyformValues}
  const activeBinding = createMemo(() =>
    getDocumentParameterBindings(props.document()).find(
      (binding) => binding.id === activeBindingId(),
    ),
  )
  const {previewDocument, previewInfluences, influence} = useInfluencePreview({
    binding: activeBinding,
    document: props.document,
    parameterValues: parameterValueMap,
  })
  const activeTargetNodeIds = createMemo(() => {
    const binding = activeBinding()
    return binding === undefined ? [] : getParameterTargetNodeIds(binding, props.document())
  })
  const parameterValues = createMemo<PuppetParameterValues>(() => {
    const binding = activeBinding()
    return binding === undefined
      ? [0]
      : getParameterBindingValues({
          binding,
          document: props.document(),
          parameterValues: parameterValueMap(),
        })
  })
  createParameterSelectionSync(
    {activeBindingId, parameterValueMap, props, setters},
    allParametersVisible,
  )
  const selectBinding = createBindingSelectionHandler(props, parameterValueMap, setters)
  const updateValues = createParameterValueHandler({
    activeBinding,
    props,
    setActiveKeyformValues,
    setParameterValueMap,
  })
  const [createParameter, create2dParameter, create3dParameter] = PARAMETER_DIMENSIONS.map(
    (dimension) => createParameterBindingHandler(props, parameterValueMap, setters, dimension),
  )
  const createKeyform = createKeyformInsertionHandler({
    activeBinding,
    parameterValues,
    props,
    setActiveKeyformValues,
  })
  const removeKeyform = createKeyformRemovalHandler(
    props,
    activeBinding,
    activeKeyformValues,
    setActiveKeyformValues,
  )
  const moveKeyform = createKeyformMoveHandler({
    activeBinding,
    onDocumentChange: props.onDocumentChange,
    onNotice: props.onNotice,
    props,
    setActiveKeyformValues,
    setParameterValueMap,
  })
  return {
    ...createKeyformGenerationHandlers({
      activeBinding,
      activeKeyformValues,
      parameterValues,
      props,
      updateValues,
    }),
    activeBinding,
    activeBindingId,
    activeKeyformValues,
    activeTargetNodeIds,
    addKeyform: createKeyform,
    addParameter: createParameter,
    addThreeDimensionalParameter: create3dParameter,
    addTwoDimensionalParameter: create2dParameter,
    allParametersVisible,
    connectSelection: createConnectionHandler(props, activeBinding, 'connect'),
    deleteKeyform: removeKeyform,
    deleteKeyformPlane: createPlaneRemovalHandler(props, activeBinding, setActiveKeyformValues),
    deleteParameter(bindingId) {
      const document = deleteParameter({bindingId, document: props.document()})
      if (document === undefined) {
        return
      }
      props.onDocumentChange(document)
      if (bindingId === activeBindingId()) {
        const [nextBinding] = getSelectableBindings(
          document,
          getDocumentParameterBindings(document),
        )
        selectBindingState(document, nextBinding, parameterValueMap(), setters)
      }
      props.onNotice(null)
    },
    disconnectSelection: createConnectionHandler(props, activeBinding, 'disconnect'),
    influence,
    moveKeyform,
    parameterValueMap,
    parameterValues,
    previewDocument,
    previewInfluences,
    renameParameter: (parameterId, name) =>
      applyParameterName(props, activeBindingId(), parameterId, name),
    requestBinding: (bindingId) =>
      props.onSelectionRequest === undefined
        ? selectBinding(bindingId)
        : props.onSelectionRequest(bindingId),
    reset(document) {
      const nextParameterValues = getDefaultParameterValueMap(document)
      setParameterValueMap(nextParameterValues)
      selectBindingState(
        document,
        getSelectableBindings(document, getDocumentParameterBindings(document))[0],
        nextParameterValues,
        setters,
      )
    },
    selectBinding,
    selectedBindingId: () => props.selectedBindingId?.() ?? activeBindingId(),
    selectKeyform: updateValues,
    setAllParametersVisible: createVisibilityHandler(
      props,
      activeBindingId,
      setAllParametersVisible,
    ),
    setInfluences: (influences) => applyInfluences(props, activeBinding(), influences),
    setParameterValues: updateValues,
  }
}
