import {clamp} from 'es-toolkit/math'
import {type Accessor, createMemo, createSignal, type Setter} from 'solid-js'

import {
  getDefaultParameterValueMap,
  getParameterBindingValues,
  parameterValuesEqual,
  type PuppetParameterValueMap,
  type PuppetParameterValues,
} from '../deformation'
import type {PuppetDocument, PuppetParameterBinding} from '../player/document'
import {
  addParameter,
  addTwoDimensionalParameter,
  connectParameterParts,
  deleteParameter,
  deleteParameterKeyform,
  disconnectParameterParts,
  getBindingParameters,
  getDefaultParameterValues,
  getDocumentParameterBindings,
  getParameterTargetPartIds,
  insertParameterKeyform,
  moveParameterKeyform,
  renameParameter,
} from './internal/parameter-keyforms'

interface UseParameterEditorProps {
  readonly document: Accessor<PuppetDocument>
  readonly onDocumentChange: Setter<PuppetDocument>
  readonly onNotice: Setter<string | null>
  readonly selectedPartIds: Accessor<ReadonlyArray<string>>
}

export interface ParameterEditorResult {
  readonly activeBinding: Accessor<PuppetParameterBinding | undefined>
  readonly activeBindingId: Accessor<string | null>
  readonly activeKeyformValues: Accessor<PuppetParameterValues | null>
  readonly activeTargetPartIds: Accessor<ReadonlyArray<string>>
  readonly addKeyform: () => void
  readonly addParameter: () => void
  readonly addTwoDimensionalParameter: () => void
  readonly connectSelection: () => void
  readonly deleteKeyform: () => void
  readonly deleteParameter: (bindingId: string) => void
  readonly disconnectSelection: () => void
  readonly moveKeyform: (values: PuppetParameterValues, nextValues: PuppetParameterValues) => void
  readonly parameterValues: Accessor<PuppetParameterValues>
  readonly parameterValueMap: Accessor<PuppetParameterValueMap>
  readonly renameParameter: (parameterId: string, name: string) => void
  readonly reset: (document: PuppetDocument) => void
  readonly selectBinding: (bindingId: string) => void
  readonly selectKeyform: (values: PuppetParameterValues) => void
  readonly setParameterValues: (values: PuppetParameterValues) => void
}

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
  const partIds = props.selectedPartIds()
  if (partIds.length === 0) {
    return
  }

  const document =
    operation === 'connect'
      ? connectParameterParts({bindingId: binding.id, document: props.document(), partIds})
      : disconnectParameterParts({bindingId: binding.id, document: props.document(), partIds})

  if (document !== undefined) {
    props.onDocumentChange(document)
    props.onNotice(
      `${partIds.length}개 파트를 ${operation === 'connect' ? '연결했습니다.' : '연결 해제했습니다.'}`,
    )
  }
}

interface ParameterSelectionSetters {
  readonly activeBindingId: Setter<string | null>
  readonly activeKeyformValues: Setter<PuppetParameterValues | null>
}

const selectBindingState = (
  document: PuppetDocument,
  binding: PuppetParameterBinding | undefined,
  parameterValues: PuppetParameterValueMap,
  setters: ParameterSelectionSetters,
) => {
  setters.activeBindingId(binding?.id ?? null)
  setters.activeKeyformValues(getDefaultKeyformValues(document, binding, parameterValues))
}

const createParameterBindingHandler =
  (
    props: UseParameterEditorProps,
    parameterValueMap: Accessor<PuppetParameterValueMap>,
    setters: ParameterSelectionSetters,
    dimension: 1 | 2,
  ) =>
  () => {
    const partIds = props.selectedPartIds()
    if (partIds.length === 0) {
      props.onNotice('Parameter를 연결할 레이어나 그룹을 먼저 선택하세요.')
      return
    }

    const result =
      dimension === 1
        ? addParameter({document: props.document(), partIds})
        : addTwoDimensionalParameter({document: props.document(), partIds})
    if (result !== undefined) {
      props.onDocumentChange(result.document)
      selectBindingState(result.document, result.binding, parameterValueMap(), setters)
      props.onNotice(`${dimension}차원 Parameter를 추가했습니다.`)
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
      props.onNotice(`${formatValues(values)} 값의 키폼을 삭제했습니다.`)
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
    const nextValues = values.map((value, index) => {
      const parameter = parameters[index]
      return parameter === undefined || !Number.isFinite(value)
        ? (parameter?.defaultValue ?? 0)
        : clamp(value, parameter.minimum, parameter.maximum)
    }) as unknown as PuppetParameterValues
    options.setParameterValueMap((currentValues) => ({
      ...currentValues,
      ...Object.fromEntries(
        binding.parameterIds.map((parameterId, index) => [parameterId, nextValues[index]]),
      ),
    }))
    options.setActiveKeyformValues(
      binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, nextValues))
        ? nextValues
        : null,
    )
  }

interface CreateKeyformMoveHandlerOptions extends CreateParameterValueHandlerOptions {
  readonly onDocumentChange: Setter<PuppetDocument>
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
        ...Object.fromEntries(
          binding.parameterIds.map((parameterId, index) => [parameterId, nextValues[index]]),
        ),
      }))
      options.setActiveKeyformValues(nextValues)
      options.onNotice(
        `${formatValues(values)} 값의 키폼을 ${formatValues(nextValues)} 값으로 이동했습니다.`,
      )
    }
  }

export const useParameterEditor = (props: UseParameterEditorProps): ParameterEditorResult => {
  const [initialBinding] = getDocumentParameterBindings(props.document())
  const [activeBindingId, setActiveBindingId] = createSignal<string | null>(
    initialBinding?.id ?? null,
  )
  const [parameterValueMap, setParameterValueMap] = createSignal<PuppetParameterValueMap>(
    getDefaultParameterValueMap(props.document()),
  )
  const [activeKeyformValues, setActiveKeyformValues] = createSignal<PuppetParameterValues | null>(
    getDefaultKeyformValues(props.document(), initialBinding, parameterValueMap()),
  )
  const setters: ParameterSelectionSetters = {
    activeBindingId: setActiveBindingId,
    activeKeyformValues: setActiveKeyformValues,
  }
  const activeBinding = createMemo(() =>
    getDocumentParameterBindings(props.document()).find(
      (binding) => binding.id === activeBindingId(),
    ),
  )
  const activeTargetPartIds = createMemo(() => {
    const binding = activeBinding()
    return binding === undefined ? [] : getParameterTargetPartIds(binding)
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
  const selectBinding = (bindingId: string) => {
    const document = props.document()
    const binding = getDocumentParameterBindings(document).find(
      (candidate) => candidate.id === bindingId,
    )
    if (binding !== undefined) {
      selectBindingState(document, binding, parameterValueMap(), setters)
    }
  }
  const updateValues = createParameterValueHandler({
    activeBinding,
    props,
    setActiveKeyformValues,
    setParameterValueMap,
  })
  const createParameter = createParameterBindingHandler(props, parameterValueMap, setters, 1)
  const create2dParameter = createParameterBindingHandler(props, parameterValueMap, setters, 2)
  const createKeyform = () => {
    const binding = activeBinding()
    const values = parameterValues()
    if (binding === undefined || activeTargetPartIds().length === 0) {
      return
    }

    if (binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, values))) {
      setActiveKeyformValues(values)
      props.onNotice('현재 값에는 이미 키폼이 있습니다.')
      return
    }

    const document = insertParameterKeyform({
      bindingId: binding.id,
      document: props.document(),
      values,
    })
    if (document !== undefined) {
      props.onDocumentChange(document)
      setActiveKeyformValues(values)
      props.onNotice(`${formatValues(values)} 값에 키폼을 추가했습니다.`)
    }
  }
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
    activeBinding,
    activeBindingId,
    activeKeyformValues,
    activeTargetPartIds,
    addKeyform: createKeyform,
    addParameter: createParameter,
    addTwoDimensionalParameter: create2dParameter,
    connectSelection: () => {
      const binding = activeBinding()
      if (binding !== undefined) {
        updateParameterConnection(props, binding, 'connect')
      }
    },
    deleteKeyform: removeKeyform,
    deleteParameter(bindingId) {
      const document = deleteParameter({bindingId, document: props.document()})
      if (document === undefined) {
        return
      }

      props.onDocumentChange(document)
      if (bindingId === activeBindingId()) {
        const [nextBinding] = getDocumentParameterBindings(document)
        selectBindingState(document, nextBinding, parameterValueMap(), setters)
      }
      props.onNotice('Parameter를 삭제했습니다.')
    },
    disconnectSelection: () => {
      const binding = activeBinding()
      if (binding !== undefined) {
        updateParameterConnection(props, binding, 'disconnect')
      }
    },
    moveKeyform,
    parameterValueMap,
    parameterValues,
    renameParameter(parameterId, name) {
      const bindingId = activeBindingId()
      if (bindingId === null) {
        return
      }

      const document = renameParameter({bindingId, document: props.document(), name, parameterId})
      if (document !== undefined) {
        props.onDocumentChange(document)
      }
    },
    reset(document) {
      const nextParameterValues = getDefaultParameterValueMap(document)
      setParameterValueMap(nextParameterValues)
      selectBindingState(
        document,
        getDocumentParameterBindings(document)[0],
        nextParameterValues,
        setters,
      )
    },
    selectBinding,
    selectKeyform(values) {
      updateValues(values)
    },
    setParameterValues: updateValues,
  }
}
