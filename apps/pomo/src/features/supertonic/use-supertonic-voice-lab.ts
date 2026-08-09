import {type Accessor, createMemo, createSignal, onCleanup, type Setter, untrack} from 'solid-js'

import {createSupertonicClient} from './client'
import {getSupertonicErrorMessage} from './error-message'
import type {SupertonicError} from './errors'
import type {SupertonicAudio, SupertonicProgress} from './messages'
import {
  getSupertonicModel,
  type SupertonicModel,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from './model'
import type {Result} from './result'
import {createWaveBlob} from './wav'

const MAXIMUM_PROGRESS = 100
const DEFAULT_MODEL_ID: SupertonicModelId = 'full'
const DEFAULT_VOICE_ID: SupertonicVoiceId = 'F1'

interface UnpreparedState {
  readonly message: string
  readonly status: 'unprepared'
}

interface PreparingState {
  readonly message: string
  readonly progress: number
  readonly status: 'preparing'
}

interface ReadyState {
  readonly message: string
  readonly status: 'complete' | 'generating' | 'ready'
}

interface ErrorState {
  readonly errorMessage: string
  readonly isModelReady: boolean
  readonly message: string
  readonly status: 'error'
}

export type SupertonicVoiceLabState = ErrorState | PreparingState | ReadyState | UnpreparedState

export interface SupertonicVoiceResult {
  readonly generationTime: number
  readonly modelId: SupertonicModelId
  readonly url: string
}

interface InitializeVoiceLabClientOptions {
  readonly modelId: SupertonicModelId
  readonly onProgress: (progress: SupertonicProgress) => void
  readonly onStatus: (message: string) => void
}

interface GenerateVoiceLabClientOptions {
  readonly text: string
  readonly voiceId: SupertonicVoiceId
}

export interface SupertonicVoiceLabClient {
  dispose: () => void
  generate: (
    options: GenerateVoiceLabClientOptions,
  ) => Promise<Result<SupertonicAudio, SupertonicError>>
  initialize: (options: InitializeVoiceLabClientOptions) => Promise<Result<void, SupertonicError>>
}

export interface SupertonicVoiceLabRuntime {
  readonly createAudioUrl: (audio: SupertonicAudio) => string
  readonly createClient: () => SupertonicVoiceLabClient
  readonly revokeAudioUrl: (url: string) => void
}

export interface UseSupertonicVoiceLabProps {
  readonly initialModelId?: SupertonicModelId
  readonly initialText?: string
  readonly initialVoiceId?: SupertonicVoiceId
  readonly runtime?: SupertonicVoiceLabRuntime
}

export interface SupertonicVoiceLabController {
  readonly canGenerate: Accessor<boolean>
  readonly canPrepare: Accessor<boolean>
  readonly errorMessage: Accessor<string | null>
  readonly generate: () => Promise<void>
  readonly isBusy: Accessor<boolean>
  readonly isModelReady: Accessor<boolean>
  readonly prepare: () => Promise<void>
  readonly progress: Accessor<number>
  readonly results: Accessor<ReadonlyArray<SupertonicVoiceResult>>
  readonly selectModel: (modelId: SupertonicModelId) => void
  readonly selectVoice: (voiceId: SupertonicVoiceId) => void
  readonly selectedModel: Accessor<SupertonicModel>
  readonly selectedModelId: Accessor<SupertonicModelId>
  readonly selectedVoiceId: Accessor<SupertonicVoiceId>
  readonly setText: (text: string) => void
  readonly state: Accessor<SupertonicVoiceLabState>
  readonly statusMessage: Accessor<string>
  readonly text: Accessor<string>
}

interface CreateVoiceLabSelectorsOptions {
  readonly state: Accessor<SupertonicVoiceLabState>
  readonly text: Accessor<string>
}

interface VoiceLabSelectors {
  readonly canGenerate: Accessor<boolean>
  readonly canPrepare: Accessor<boolean>
  readonly errorMessage: Accessor<string | null>
  readonly isBusy: Accessor<boolean>
  readonly isModelReady: Accessor<boolean>
  readonly progress: Accessor<number>
  readonly statusMessage: Accessor<string>
}

interface VoiceLabClientReference {
  current: SupertonicVoiceLabClient | null
}

interface CreatePrepareOptions {
  readonly clientReference: VoiceLabClientReference
  readonly isBusy: Accessor<boolean>
  readonly runtime: SupertonicVoiceLabRuntime
  readonly selectedModel: Accessor<SupertonicModel>
  readonly setState: Setter<SupertonicVoiceLabState>
}

interface CreateGenerateOptions {
  readonly clientReference: VoiceLabClientReference
  readonly isBusy: Accessor<boolean>
  readonly isModelReady: Accessor<boolean>
  readonly selectedModelId: Accessor<SupertonicModelId>
  readonly selectedVoiceId: Accessor<SupertonicVoiceId>
  readonly setAudioResult: (audio: SupertonicAudio, modelId: SupertonicModelId) => void
  readonly setState: Setter<SupertonicVoiceLabState>
  readonly text: Accessor<string>
}

const DEFAULT_RUNTIME: SupertonicVoiceLabRuntime = {
  createAudioUrl: (audio) => URL.createObjectURL(createWaveBlob(audio.samples, audio.sampleRate)),
  createClient: createSupertonicClient,
  revokeAudioUrl: (url) => URL.revokeObjectURL(url),
}

const getInitialMessage = () => 'Full과 INT8을 각각 준비해 품질과 생성 시간을 비교할 수 있어요.'

const reportUnexpectedError = (error: unknown) => {
  console.error('Unexpected Supertonic failure', error)
}

const getProgressPercentage = (progress: SupertonicProgress) =>
  Math.min(
    MAXIMUM_PROGRESS,
    Math.round((progress.loadedBytes / progress.totalBytes) * MAXIMUM_PROGRESS),
  )

const revokeAudioUrls = (
  runtime: SupertonicVoiceLabRuntime,
  audioUrls: ReadonlyMap<SupertonicModelId, string>,
) => {
  for (const url of audioUrls.values()) {
    runtime.revokeAudioUrl(url)
  }
}

const setStateMessage = (
  state: SupertonicVoiceLabState,
  message: string,
): SupertonicVoiceLabState => ({...state, message})

const createVoiceLabSelectors = (options: CreateVoiceLabSelectorsOptions): VoiceLabSelectors => {
  const isBusy = createMemo(() => {
    const {status} = options.state()
    return status === 'generating' || status === 'preparing'
  })
  const isModelReady = createMemo(() => {
    const currentState = options.state()
    return (
      currentState.status === 'complete' ||
      currentState.status === 'generating' ||
      currentState.status === 'ready' ||
      (currentState.status === 'error' && currentState.isModelReady)
    )
  })
  const canGenerate = createMemo(
    () => !isBusy() && isModelReady() && options.text().trim().length > 0,
  )
  const canPrepare = createMemo(() => !isBusy() && !isModelReady())
  const errorMessage = createMemo(() => {
    const currentState = options.state()
    return currentState.status === 'error' ? currentState.errorMessage : null
  })
  const progress = createMemo(() => {
    const currentState = options.state()

    if (currentState.status === 'preparing') {
      return currentState.progress
    }

    return isModelReady() ? MAXIMUM_PROGRESS : 0
  })
  const statusMessage = createMemo(() => options.state().message)

  return {canGenerate, canPrepare, errorMessage, isBusy, isModelReady, progress, statusMessage}
}

const disposeVoiceLabClient = (clientReference: VoiceLabClientReference) => {
  clientReference.current?.dispose()
  clientReference.current = null
}

const createPrepare = (options: CreatePrepareOptions) => async () => {
  if (options.isBusy()) {
    return
  }

  disposeVoiceLabClient(options.clientReference)
  const nextClient = options.runtime.createClient()
  const model = options.selectedModel()
  options.clientReference.current = nextClient
  options.setState({
    message: `${model.label} 모델을 확인하고 있어요…`,
    progress: 0,
    status: 'preparing',
  })

  try {
    const result = await nextClient.initialize({
      modelId: model.id,
      onProgress: (nextProgress) => {
        if (options.clientReference.current === nextClient) {
          options.setState({
            message: `${nextProgress.fileName} 준비 중…`,
            progress: getProgressPercentage(nextProgress),
            status: 'preparing',
          })
        }
      },
      onStatus: (message) => {
        if (options.clientReference.current === nextClient) {
          options.setState((currentState) => setStateMessage(currentState, message))
        }
      },
    })

    if (options.clientReference.current !== nextClient) {
      return
    }

    options.setState(
      result.ok
        ? {
            message: '모델 준비가 끝났어요. 이제 대사를 음성으로 만들 수 있어요.',
            status: 'ready',
          }
        : {
            errorMessage: getSupertonicErrorMessage(result.error),
            isModelReady: false,
            message: '모델 준비에 실패했어요.',
            status: 'error',
          },
    )
  } catch (error: unknown) {
    if (options.clientReference.current === nextClient) {
      reportUnexpectedError(error)
      options.setState({
        errorMessage: '모델을 준비하는 중 예상하지 못한 문제가 발생했어요.',
        isModelReady: false,
        message: '모델 준비에 실패했어요.',
        status: 'error',
      })
    }
  }
}

const createGenerate = (options: CreateGenerateOptions) => async () => {
  const currentClient = options.clientReference.current
  const currentText = options.text().trim()
  const modelId = options.selectedModelId()

  if (
    currentClient === null ||
    options.isBusy() ||
    !options.isModelReady() ||
    currentText.length === 0
  ) {
    return
  }

  options.setState({message: '음성을 생성하고 있어요.', status: 'generating'})

  try {
    const result = await currentClient.generate({
      text: currentText,
      voiceId: options.selectedVoiceId(),
    })

    if (options.clientReference.current !== currentClient) {
      return
    }

    if (result.ok) {
      options.setAudioResult(result.value, modelId)
      options.setState({
        message: '음성이 완성됐어요. 재생하거나 WAV 파일로 내려받을 수 있어요.',
        status: 'complete',
      })
    } else {
      options.setState({
        errorMessage: getSupertonicErrorMessage(result.error),
        isModelReady: true,
        message: '음성 생성에 실패했어요.',
        status: 'error',
      })
    }
  } catch (error: unknown) {
    if (options.clientReference.current === currentClient) {
      reportUnexpectedError(error)
      options.setState({
        errorMessage: '음성을 생성하는 중 예상하지 못한 문제가 발생했어요.',
        isModelReady: true,
        message: '음성 생성에 실패했어요.',
        status: 'error',
      })
    }
  }
}

/** Manages Supertonic model, voice, generation, and disposable audio resources. */
export const useSupertonicVoiceLab = (
  props: UseSupertonicVoiceLabProps = {},
): SupertonicVoiceLabController => {
  const initialModelId = untrack(() => props.initialModelId ?? DEFAULT_MODEL_ID)
  const initialText = untrack(() => props.initialText ?? '')
  const initialVoiceId = untrack(() => props.initialVoiceId ?? DEFAULT_VOICE_ID)
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const [text, setTextSignal] = createSignal(initialText)
  const [selectedModelId, setSelectedModelId] = createSignal(initialModelId)
  const [selectedVoiceId, setSelectedVoiceId] = createSignal(initialVoiceId)
  const [state, setState] = createSignal<SupertonicVoiceLabState>({
    message: getInitialMessage(),
    status: 'unprepared',
  })
  const [results, setResults] = createSignal<ReadonlyArray<SupertonicVoiceResult>>([])
  const audioUrls = new Map<SupertonicModelId, string>()
  const clientReference: VoiceLabClientReference = {current: null}

  const selectedModel = createMemo(() => getSupertonicModel(selectedModelId()))
  const {canGenerate, canPrepare, errorMessage, isBusy, isModelReady, progress, statusMessage} =
    createVoiceLabSelectors({state, text})

  const setAudioResult = (audio: SupertonicAudio, modelId: SupertonicModelId) => {
    const previousUrl = audioUrls.get(modelId)

    if (previousUrl !== undefined) {
      runtime.revokeAudioUrl(previousUrl)
    }

    const result = {
      generationTime: audio.generationTime,
      modelId,
      url: runtime.createAudioUrl(audio),
    }
    audioUrls.set(modelId, result.url)
    setResults((currentResults) => [
      ...currentResults.filter((item) => item.modelId !== modelId),
      result,
    ])
  }

  onCleanup(() => {
    disposeVoiceLabClient(clientReference)
    revokeAudioUrls(runtime, audioUrls)
  })

  const selectModel = (modelId: SupertonicModelId) => {
    if (modelId === selectedModelId()) {
      return
    }

    disposeVoiceLabClient(clientReference)
    setSelectedModelId(modelId)
    setState({
      message: `${getSupertonicModel(modelId).label} 모델을 준비해 비교할 수 있어요.`,
      status: 'unprepared',
    })
  }

  const selectVoice = (voiceId: SupertonicVoiceId) => setSelectedVoiceId(voiceId)
  const setText = (nextText: string) => setTextSignal(nextText)
  const prepare = createPrepare({clientReference, isBusy, runtime, selectedModel, setState})
  const generate = createGenerate({
    clientReference,
    isBusy,
    isModelReady,
    selectedModelId,
    selectedVoiceId,
    setAudioResult,
    setState,
    text,
  })

  return {
    canGenerate,
    canPrepare,
    errorMessage,
    generate,
    isBusy,
    isModelReady,
    prepare,
    progress,
    results,
    selectedModel,
    selectedModelId,
    selectedVoiceId,
    selectModel,
    selectVoice,
    setText,
    state,
    statusMessage,
    text,
  }
}
