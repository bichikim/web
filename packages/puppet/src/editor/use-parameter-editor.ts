import {clamp} from 'es-toolkit/math'
import {type Accessor, createMemo, createSignal, type Setter} from 'solid-js'

import type {PuppetDocument, PuppetParameter} from '../player/document'
import {
  addParameter,
  connectParameterParts,
  createParameterPreview,
  deleteParameter,
  deleteParameterKeyform,
  disconnectParameterParts,
  getDocumentParameters,
  getParameterTargetPartIds,
  insertParameterKeyform,
  moveParameterKeyform,
  renameParameter,
} from './internal/parameter-keyforms'

interface UseParameterEditorOptions {
  readonly document: Accessor<PuppetDocument>
  readonly onDocumentChange: Setter<PuppetDocument>
  readonly onNotice: Setter<string | null>
  readonly selectedPartIds: Accessor<ReadonlyArray<string>>
}

export interface ParameterEditorResult {
  readonly activeKeyformValue: Accessor<number | null>
  readonly activeParameter: Accessor<PuppetParameter | undefined>
  readonly activeParameterId: Accessor<string | null>
  readonly activeTargetPartIds: Accessor<ReadonlyArray<string>>
  readonly addKeyform: () => void
  readonly addParameter: () => void
  readonly connectSelection: () => void
  readonly deleteKeyform: () => void
  readonly deleteParameter: (parameterId: string) => void
  readonly disconnectSelection: () => void
  readonly moveKeyform: (value: number, nextValue: number) => void
  readonly parameterValue: Accessor<number>
  readonly previewDocument: Accessor<PuppetDocument>
  readonly renameParameter: (name: string) => void
  readonly reset: (document: PuppetDocument) => void
  readonly selectKeyform: (value: number) => void
  readonly selectParameter: (parameterId: string) => void
  readonly setParameterValue: (value: number) => void
}

const getDefaultKeyformValue = (parameter: PuppetParameter | undefined) =>
  parameter?.keyforms.some((keyform) => keyform.value === parameter.defaultValue) === true
    ? parameter.defaultValue
    : null

type ParameterConnectionOperation = 'connect' | 'disconnect'

interface UpdateParameterConnectionOptions {
  readonly document: PuppetDocument
  readonly operation: ParameterConnectionOperation
  readonly parameterId: string
  readonly partIds: ReadonlyArray<string>
}

const updateParameterConnection = (options: UpdateParameterConnectionOptions) =>
  options.operation === 'connect'
    ? connectParameterParts(options)
    : disconnectParameterParts(options)

const createSelectionConnectionHandler =
  (
    options: UseParameterEditorOptions,
    activeParameter: Accessor<PuppetParameter | undefined>,
    operation: ParameterConnectionOperation,
  ) =>
  () => {
    const parameter = activeParameter()
    const partIds = options.selectedPartIds()

    if (parameter === undefined || partIds.length === 0) {
      return
    }

    const document = updateParameterConnection({
      document: options.document(),
      operation,
      parameterId: parameter.id,
      partIds,
    })

    if (document !== undefined) {
      options.onDocumentChange(document)
      options.onNotice(
        `${partIds.length}개 파트를 ${parameter.name}에 ${operation === 'connect' ? '연결했습니다.' : '연결 해제했습니다.'}`,
      )
    }
  }

interface ParameterSelectionSetters {
  readonly activeKeyformValue: Setter<number | null>
  readonly activeParameterId: Setter<string | null>
  readonly parameterValue: Setter<number>
}

interface KeyformMoveSetters {
  readonly activeKeyformValue: Setter<number | null>
  readonly parameterValue: Setter<number>
}

const createParameterRemovalHandler =
  (
    options: UseParameterEditorOptions,
    activeParameterId: Accessor<string | null>,
    setters: ParameterSelectionSetters,
  ) =>
  (parameterId: string) => {
    const parameters = getDocumentParameters(options.document())
    const parameterIndex = parameters.findIndex((parameter) => parameter.id === parameterId)
    const parameter = parameters[parameterIndex]

    if (parameter === undefined) {
      return
    }

    const document = deleteParameter({document: options.document(), parameterId})

    if (document === undefined) {
      return
    }

    options.onDocumentChange(document)
    if (activeParameterId() === parameterId) {
      const remainingParameters = getDocumentParameters(document)
      const nextParameter = remainingParameters[parameterIndex] ?? remainingParameters.at(-1)
      setters.activeParameterId(nextParameter?.id ?? null)
      setters.parameterValue(nextParameter?.defaultValue ?? 0)
      setters.activeKeyformValue(getDefaultKeyformValue(nextParameter))
    }
    options.onNotice(`${parameter.name}를 삭제했습니다.`)
  }

const createKeyformMoveHandler =
  (
    options: UseParameterEditorOptions,
    activeParameter: Accessor<PuppetParameter | undefined>,
    setters: KeyformMoveSetters,
  ) =>
  (value: number, nextValue: number) => {
    const parameter = activeParameter()

    if (parameter === undefined || value === nextValue) {
      return
    }

    if (parameter.keyforms.some((keyform) => keyform.value === nextValue)) {
      options.onNotice(`${nextValue.toFixed(2)} 값에는 이미 키폼이 있습니다.`)
      return
    }

    const document = moveParameterKeyform({
      document: options.document(),
      nextValue,
      parameterId: parameter.id,
      value,
    })

    if (document !== undefined) {
      options.onDocumentChange(document)
      setters.parameterValue(nextValue)
      setters.activeKeyformValue(nextValue)
      options.onNotice(
        `${value.toFixed(2)} 값의 키폼을 ${nextValue.toFixed(2)} 값으로 이동했습니다.`,
      )
    }
  }

const createParameterValueHandler = (
  activeParameter: Accessor<PuppetParameter | undefined>,
  setters: KeyformMoveSetters,
) =>
  function updateParameterValue(value: number) {
    const parameter = activeParameter()

    if (parameter === undefined || !Number.isFinite(value)) {
      return
    }

    const nextValue = clamp(value, parameter.minimum, parameter.maximum)
    setters.parameterValue(nextValue)
    setters.activeKeyformValue(
      parameter.keyforms.some((keyform) => keyform.value === nextValue) ? nextValue : null,
    )
  }

export const useParameterEditor = (options: UseParameterEditorOptions): ParameterEditorResult => {
  const initialParameter = options.document().parameters?.[0]
  const [activeParameterId, setActiveParameterId] = createSignal<string | null>(
    initialParameter?.id ?? null,
  )
  const [parameterValue, setParameterValue] = createSignal(initialParameter?.defaultValue ?? 0)
  const [activeKeyformValue, setActiveKeyformValue] = createSignal<number | null>(
    getDefaultKeyformValue(initialParameter),
  )
  const activeParameter = createMemo<PuppetParameter | undefined>(() =>
    getDocumentParameters(options.document()).find(
      (parameter) => parameter.id === activeParameterId(),
    ),
  )
  const activeTargetPartIds = createMemo(() => {
    const parameter = activeParameter()
    return parameter === undefined ? [] : getParameterTargetPartIds(parameter)
  })
  const previewDocument = createMemo(() =>
    createParameterPreview({
      document: options.document(),
      parameter: activeParameter(),
      value: parameterValue(),
    }),
  )
  const connectSelection = createSelectionConnectionHandler(options, activeParameter, 'connect')
  const disconnectSelection = createSelectionConnectionHandler(
    options,
    activeParameter,
    'disconnect',
  )
  const removeParameter = createParameterRemovalHandler(options, activeParameterId, {
    activeKeyformValue: setActiveKeyformValue,
    activeParameterId: setActiveParameterId,
    parameterValue: setParameterValue,
  })
  const moveKeyform = createKeyformMoveHandler(options, activeParameter, {
    activeKeyformValue: setActiveKeyformValue,
    parameterValue: setParameterValue,
  })
  const updateParameterValue = createParameterValueHandler(activeParameter, {
    activeKeyformValue: setActiveKeyformValue,
    parameterValue: setParameterValue,
  })
  const reset = (document: PuppetDocument) => {
    const parameter = document.parameters?.[0]
    setActiveParameterId(parameter?.id ?? null)
    setParameterValue(parameter?.defaultValue ?? 0)
    setActiveKeyformValue(getDefaultKeyformValue(parameter))
  }
  const selectParameter = (parameterId: string) => {
    const parameter = getDocumentParameters(options.document()).find(
      (candidate) => candidate.id === parameterId,
    )

    if (parameter !== undefined) {
      setActiveParameterId(parameter.id)
      setParameterValue(parameter.defaultValue)
      setActiveKeyformValue(getDefaultKeyformValue(parameter))
    }
  }
  const createParameter = () => {
    const partIds = options.selectedPartIds()

    if (partIds.length === 0) {
      options.onNotice('Parameter를 연결할 레이어나 그룹을 먼저 선택하세요.')
      return
    }

    const result = addParameter({document: options.document(), partIds})

    if (result !== undefined) {
      options.onDocumentChange(result.document)
      setActiveParameterId(result.parameter.id)
      setParameterValue(result.parameter.defaultValue)
      setActiveKeyformValue(result.parameter.defaultValue)
      options.onNotice(`${result.parameter.name}를 추가했습니다.`)
    }
  }
  const updateParameterName = (name: string) => {
    const parameterId = activeParameterId()

    if (parameterId === null) {
      return
    }

    const document = renameParameter({document: options.document(), name, parameterId})

    if (document !== undefined) {
      options.onDocumentChange(document)
    }
  }
  const createKeyform = () => {
    const parameter = activeParameter()

    if (parameter === undefined || activeTargetPartIds().length === 0) {
      return
    }

    if (parameter.keyforms.some((keyform) => keyform.value === parameterValue())) {
      setActiveKeyformValue(parameterValue())
      options.onNotice('현재 값에는 이미 키폼이 있습니다.')
      return
    }

    const document = insertParameterKeyform({
      document: options.document(),
      parameterId: parameter.id,
      value: parameterValue(),
    })

    if (document !== undefined) {
      options.onDocumentChange(document)
      setActiveKeyformValue(parameterValue())
      options.onNotice(`${parameterValue().toFixed(2)} 값에 키폼을 추가했습니다.`)
    }
  }
  const removeKeyform = () => {
    const parameter = activeParameter()
    const value = activeKeyformValue()

    if (parameter === undefined || value === null) {
      return
    }

    const document = deleteParameterKeyform({
      document: options.document(),
      parameterId: parameter.id,
      value,
    })

    if (document !== undefined) {
      options.onDocumentChange(document)
      setActiveKeyformValue(null)
      options.onNotice(`${value.toFixed(2)} 값의 키폼을 삭제했습니다.`)
    }
  }
  return {
    activeKeyformValue,
    activeParameter,
    activeParameterId,
    activeTargetPartIds,
    addKeyform: createKeyform,
    addParameter: createParameter,
    connectSelection,
    deleteKeyform: removeKeyform,
    deleteParameter: removeParameter,
    disconnectSelection,
    moveKeyform,
    parameterValue,
    previewDocument,
    renameParameter: updateParameterName,
    reset,
    selectKeyform(value) {
      setParameterValue(value)
      setActiveKeyformValue(value)
    },
    selectParameter,
    setParameterValue: updateParameterValue,
  }
}
