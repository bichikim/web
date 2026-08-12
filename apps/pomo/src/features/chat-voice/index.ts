import {type Accessor, createMemo, createSignal, onCleanup, type Setter, untrack} from 'solid-js'

import {
  createSupertonicAudioPlayer,
  type CreateSupertonicAudioPlayerOptions,
  createSupertonicClient,
  getSupertonicErrorMessage,
  getSupertonicModel,
  type InitializeSupertonicOptions,
  type SupertonicAudioPlayer,
  type SupertonicClient,
  type SupertonicModelId,
} from '../supertonic'

const MAXIMUM_PROGRESS = 100
// AI_NOTE - Full/WebGPU intentionally matches the voice lab's low latency despite sharing GPU memory with chat.
const DEFAULT_MODEL_ID: SupertonicModelId = 'full'

interface UnpreparedState {
  readonly status: 'unprepared'
}

interface PreparingState {
  readonly progress: number
  readonly status: 'preparing'
}

interface ReadyState {
  readonly message: string
  readonly status: 'ready'
}

interface SpeakingState {
  readonly message: string
  readonly phase: 'generating' | 'playing'
  readonly status: 'speaking'
}

interface ErrorState {
  readonly message: string
  readonly modelReady: boolean
  readonly status: 'error'
}

export type ChatVoiceState =
  | ErrorState
  | PreparingState
  | ReadyState
  | SpeakingState
  | UnpreparedState

export interface ChatVoiceRuntime {
  readonly createAudioPlayer: (options: CreateSupertonicAudioPlayerOptions) => SupertonicAudioPlayer
  readonly createClient: () => SupertonicClient
}

export interface UseChatVoiceProps {
  readonly modelId?: SupertonicModelId
  readonly runtime?: ChatVoiceRuntime
}

export interface ChatVoiceController {
  readonly arm: () => void
  readonly canPrepare: Accessor<boolean>
  readonly finish: () => void
  readonly isGenerating: Accessor<boolean>
  readonly isPlaying: Accessor<boolean>
  readonly prepare: () => Promise<void>
  readonly speak: (text: string) => Promise<void>
  readonly state: Accessor<ChatVoiceState>
  readonly statusMessage: Accessor<string>
  readonly stop: () => void
}

interface PlayerReference {
  current: SupertonicAudioPlayer | null
}

interface ClientReference {
  current: SupertonicClient | null
}

interface CreatePrepareOptions {
  readonly canPrepare: Accessor<boolean>
  readonly clientReference: ClientReference
  readonly modelId: SupertonicModelId
  readonly runQueuedSpeech: () => Promise<void>
  readonly runtime: ChatVoiceRuntime
  readonly setState: Setter<ChatVoiceState>
}

interface CreateSpeechQueueOptions {
  readonly clientReference: ClientReference
  readonly isModelReady: Accessor<boolean>
  readonly runtime: ChatVoiceRuntime
  readonly setState: Setter<ChatVoiceState>
  readonly silenceDuration: number
}

interface SpeechQueueController {
  readonly arm: () => void
  readonly dispose: () => void
  readonly finish: () => void
  readonly run: () => Promise<void>
  readonly speak: (text: string) => Promise<void>
  readonly stop: () => void
}

const DEFAULT_RUNTIME: ChatVoiceRuntime = {
  createAudioPlayer: createSupertonicAudioPlayer,
  createClient: createSupertonicClient,
}

const reportUnexpectedError = (error: unknown) => {
  console.error('Unexpected chat voice failure', error)
}

const getStatusMessage = (state: ChatVoiceState) => {
  switch (state.status) {
    case 'error':
    case 'ready':
    case 'speaking':
      return state.message
    case 'preparing':
      return `답변 음성 모델 준비 중 · ${state.progress}%`
    case 'unprepared':
      return '채팅 모델과 함께 답변 음성 모델을 준비해 주세요.'
  }

  state satisfies never
}

const disposePlayer = (reference: PlayerReference) => {
  reference.current?.dispose()
  reference.current = null
}

const createPrepare = (options: CreatePrepareOptions) => async () => {
  if (!options.canPrepare()) {
    return
  }

  options.clientReference.current?.dispose()
  const client = options.runtime.createClient()
  options.clientReference.current = client
  options.setState({progress: 0, status: 'preparing'})

  const initializeOptions: InitializeSupertonicOptions = {
    modelId: options.modelId,
    onProgress: (progress) => {
      if (options.clientReference.current === client) {
        options.setState({
          progress: Math.min(
            MAXIMUM_PROGRESS,
            Math.round((progress.loadedBytes / progress.totalBytes) * MAXIMUM_PROGRESS),
          ),
          status: 'preparing',
        })
      }
    },
    onStatus: () => undefined,
  }

  try {
    const result = await client.initialize(initializeOptions)

    if (options.clientReference.current !== client) {
      return
    }

    if (!result.ok) {
      options.setState({
        message: getSupertonicErrorMessage(result.error),
        modelReady: false,
        status: 'error',
      })
      return
    }

    options.setState({message: '답변 음성 자동 재생 준비가 끝났어요.', status: 'ready'})
    await options.runQueuedSpeech()
  } catch (error: unknown) {
    if (options.clientReference.current === client) {
      reportUnexpectedError(error)
      options.setState({
        message: '답변 음성 모델을 준비하는 중 예상하지 못한 문제가 발생했어요.',
        modelReady: false,
        status: 'error',
      })
    }
  }
}

const createSpeechQueue = (options: CreateSpeechQueueOptions): SpeechQueueController => {
  const armedPlayer: PlayerReference = {current: null}
  const activePlayer: PlayerReference = {current: null}
  const speechQueue: Array<string> = []
  let generation: Promise<void> | null = null
  let playerFinished = false
  let queueFinished = true
  let session = 0

  const createPlayer = (playerSession: number) =>
    options.runtime.createAudioPlayer({
      onPlaybackEnd: () => {
        if (session === playerSession) {
          activePlayer.current = null
          options.setState((currentState) =>
            currentState.status === 'speaking'
              ? {message: '답변 음성 재생을 마쳤어요.', status: 'ready'}
              : currentState,
          )
        }
      },
    })

  const finishPlayerIfReady = () => {
    if (!queueFinished || playerFinished || generation !== null || speechQueue.length > 0) {
      return
    }

    const player = activePlayer.current ?? armedPlayer.current

    if (player !== null) {
      playerFinished = true
      player.finish()
    }
  }

  const run = () => {
    const client = options.clientReference.current
    const text = speechQueue.at(0)

    if (generation !== null || client === null || text === undefined || !options.isModelReady()) {
      return generation ?? Promise.resolve()
    }

    speechQueue.shift()
    const playerSession = session
    const player = activePlayer.current ?? armedPlayer.current ?? createPlayer(playerSession)
    armedPlayer.current = null
    activePlayer.current = player
    options.setState({
      message: '답변을 음성으로 만들고 있어요…',
      phase: 'generating',
      status: 'speaking',
    })

    generation = (async () => {
      try {
        for await (const result of client.generateStream({
          text,
          voice: {id: 'Yuna', kind: 'preset'},
        })) {
          if (session === playerSession) {
            if (!result.ok) {
              speechQueue.length = 0
              queueFinished = true
              playerFinished = true
              activePlayer.current = null
              player.dispose()
              options.setState({
                message: getSupertonicErrorMessage(result.error),
                modelReady: true,
                status: 'error',
              })
              return
            }

            if (result.value.type === 'chunk') {
              player.enqueue(result.value.audio, options.silenceDuration)
              options.setState({
                message: `${result.value.audio.index + 1}/${result.value.audio.total} 음성을 바로 재생하고 있어요.`,
                phase: 'playing',
                status: 'speaking',
              })
            }
          }
        }
      } catch (error: unknown) {
        if (session === playerSession) {
          speechQueue.length = 0
          queueFinished = true
          playerFinished = true
          activePlayer.current = null
          player.dispose()
          reportUnexpectedError(error)
          options.setState({
            message: '답변 음성을 만드는 중 예상하지 못한 문제가 발생했어요.',
            modelReady: true,
            status: 'error',
          })
        }
      } finally {
        generation = null
        run().catch(reportUnexpectedError)
        finishPlayerIfReady()
      }
    })()

    return generation
  }

  const stop = () => {
    session += 1
    speechQueue.length = 0
    playerFinished = true
    queueFinished = true
    if (generation !== null) {
      options.clientReference.current?.cancelGeneration()
    }
    disposePlayer(armedPlayer)
    disposePlayer(activePlayer)

    if (options.isModelReady()) {
      options.setState({message: '답변 음성 재생을 중지했어요.', status: 'ready'})
    }
  }

  const arm = () => {
    stop()
    playerFinished = false
    queueFinished = false
    armedPlayer.current = createPlayer(session)
  }

  const speak = async (text: string) => {
    const normalizedText = text.trim()

    if (normalizedText.length > 0) {
      speechQueue.push(normalizedText)
      await run()
    }
  }

  const finish = () => {
    queueFinished = true
    finishPlayerIfReady()
  }

  const dispose = () => {
    session += 1
    speechQueue.length = 0
    disposePlayer(armedPlayer)
    disposePlayer(activePlayer)
  }

  return {arm, dispose, finish, run, speak, stop}
}

/** Converts completed chat answers to speech and owns their cancellable playback queue. */
export const useChatVoice = (props: UseChatVoiceProps = {}): ChatVoiceController => {
  const modelId = untrack(() => props.modelId ?? DEFAULT_MODEL_ID)
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const model = getSupertonicModel(modelId)
  const [state, setState] = createSignal<ChatVoiceState>({status: 'unprepared'})
  const clientReference: ClientReference = {current: null}

  const isModelReady = createMemo(() => {
    const currentState = state()
    return (
      currentState.status === 'ready' ||
      currentState.status === 'speaking' ||
      (currentState.status === 'error' && currentState.modelReady)
    )
  })
  const canPrepare = createMemo(() => {
    const currentState = state()
    return (
      currentState.status === 'unprepared' ||
      (currentState.status === 'error' && !currentState.modelReady)
    )
  })
  const isPlaying = createMemo(() => state().status === 'speaking')
  const isGenerating = createMemo(() => {
    const currentState = state()
    return currentState.status === 'speaking' && currentState.phase === 'generating'
  })
  const statusMessage = createMemo(() => getStatusMessage(state()))
  const speechQueue = createSpeechQueue({
    clientReference,
    isModelReady,
    runtime,
    setState,
    silenceDuration: model.speechPolicy.silenceDuration,
  })

  const prepare = createPrepare({
    canPrepare,
    clientReference,
    modelId,
    runQueuedSpeech: speechQueue.run,
    runtime,
    setState,
  })

  onCleanup(() => {
    clientReference.current?.dispose()
    clientReference.current = null
    speechQueue.dispose()
  })

  return {
    arm: speechQueue.arm,
    canPrepare,
    finish: speechQueue.finish,
    isGenerating,
    isPlaying,
    prepare,
    speak: speechQueue.speak,
    state,
    statusMessage,
    stop: speechQueue.stop,
  }
}
