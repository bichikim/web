import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {type ChatVoiceController, type ChatVoiceRuntime, useChatVoice} from '../index'
import {
  type CreateSupertonicAudioPlayerOptions,
  type InitializeSupertonicOptions,
  type SupertonicAudioPlayer,
  type SupertonicClient,
} from '../../supertonic'
import {failureResult, successResult} from '../../result'
import {type PViseme} from '../../lip-sync'

vi.mock('solid-js', async () => {
  const actual = await vi.importActual<typeof import('solid-js')>('solid-js')

  return {...actual, createSignal: vi.fn(actual.createSignal)}
})

const SAMPLE_RATE = 24_000

interface ChatVoiceTestRoot {
  readonly controller: ChatVoiceController
  readonly dispose: () => void
}

interface TestAudioPlayer extends SupertonicAudioPlayer {
  readonly end: () => void
  readonly viseme: (viseme: PViseme) => void
}

const createAudio = () => ({
  generationTime: 100,
  sampleRate: SAMPLE_RATE,
  samples: Float32Array.of(0.1),
})

const createAudioChunk = () => ({...createAudio(), index: 0, total: 1})

const createClient = (): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(async () => successResult(createAudio())),
  generateStream: vi.fn(async function* generateStream() {
    yield successResult({audio: createAudioChunk(), type: 'chunk' as const})
    yield successResult({audio: createAudio(), type: 'complete' as const})
  }),
  initialize: vi.fn(async (options) => {
    options.onProgress({fileName: '음성 모델', loadedBytes: 1, totalBytes: 2})
    return successResult(undefined)
  }),
})

const createAudioPlayer = (options: CreateSupertonicAudioPlayerOptions): TestAudioPlayer => ({
  dispose: vi.fn(),
  end: () => options.onPlaybackEnd?.(),
  enqueue: vi.fn(),
  finish: vi.fn(),
  viseme: (viseme) => options.onVisemeChange?.(viseme),
})

const createRuntime = (client: SupertonicClient) => {
  const players: Array<TestAudioPlayer> = []
  const runtime: ChatVoiceRuntime = {
    createAudioPlayer: (options) => {
      const player = createAudioPlayer(options)
      players.push(player)
      return player
    },
    createClient: () => client,
  }

  return {players, runtime}
}

const createTestRoot = (runtime: ChatVoiceRuntime): ChatVoiceTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useChatVoice({runtime})
  })

  return {controller, dispose: disposeRoot}
}

describe('useChatVoice preparation', () => {
  it('should expose the default unprepared controller without creating the runtime', () => {
    let disposeRoot: () => void = () => undefined
    const chatVoice = createRoot((dispose) => {
      disposeRoot = dispose
      return useChatVoice()
    })

    expect(chatVoice.state()).toEqual({status: 'unprepared'})
    expect(chatVoice.canPrepare()).toBe(true)
    expect(chatVoice.statusMessage()).toBe('채팅 모델과 함께 답변 음성 모델을 준비해 주세요.')
    disposeRoot()
  })

  it('should leave an unsupported internal state without a status message', () => {
    const createSignalMock = vi.mocked(createSignal)
    const createSignalImplementation = createSignalMock.getMockImplementation()

    if (createSignalImplementation === undefined) {
      throw new Error('Expected the Solid signal mock to retain its implementation')
    }

    createSignalMock.mockImplementationOnce((initialValue, options) =>
      createSignalImplementation(
        {status: 'unsupported-test-state'} as typeof initialValue,
        options,
      ),
    )
    const client = createClient()
    const {runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    expect(chatVoice.controller.statusMessage()).toBeUndefined()
    chatVoice.dispose()
  })

  it('should prepare the Full GPU model and play a completed assistant answer', async () => {
    const client = createClient()
    const {players, runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()
    chatVoice.controller.arm()
    await chatVoice.controller.speak(' 안녕하세요. ')
    const playback = chatVoice.controller.finish()

    expect(client.initialize).toHaveBeenCalledWith(expect.objectContaining({modelId: 'full'}))
    expect(client.generateStream).toHaveBeenCalledWith({
      text: '안녕하세요.',
      voice: {id: 'Yuna', kind: 'preset'},
    })
    expect(players[0]?.enqueue).toHaveBeenCalledWith(createAudioChunk(), 0.3, '안녕하세요.')
    expect(chatVoice.controller.isGenerating()).toBe(false)
    expect(chatVoice.controller.isPlaying()).toBe(true)

    players[0]?.end()
    await playback
    expect(chatVoice.controller.isPlaying()).toBe(false)
    expect(chatVoice.controller.statusMessage()).toBe('답변 음성 재생을 마쳤어요.')
    chatVoice.dispose()
  })

  it('should report preparation progress and ignore callbacks after disposal', async () => {
    let initializeOptions: InitializeSupertonicOptions | undefined
    let releaseInitialization: () => void = () => undefined
    const initialization = new Promise<void>((resolve) => {
      releaseInitialization = resolve
    })
    const client = createClient()
    vi.mocked(client.initialize).mockImplementationOnce(async (options) => {
      initializeOptions = options
      await initialization
      return successResult(undefined)
    })
    const {runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    const preparation = chatVoice.controller.prepare()
    await vi.waitFor(() => expect(initializeOptions).toBeDefined())
    initializeOptions?.onStatus('모델을 준비하고 있어요.')
    initializeOptions?.onProgress({fileName: '음성 모델', loadedBytes: 12, totalBytes: 10})

    expect(chatVoice.controller.statusMessage()).toBe('답변 음성 모델 준비 중 · 100%')
    chatVoice.dispose()
    initializeOptions?.onProgress({fileName: '음성 모델', loadedBytes: 1, totalBytes: 10})
    releaseInitialization()
    await preparation

    expect(client.dispose).toHaveBeenCalledOnce()
  })

  it('should expose initialization failures and allow a successful retry', async () => {
    const client = createClient()
    vi.mocked(client.initialize)
      .mockResolvedValueOnce(
        failureResult({
          code: 'worker-failed',
          detail: '초기화 실패',
          phase: 'initialize',
          retryable: true,
        }),
      )
      .mockResolvedValueOnce(successResult(undefined))
    const {runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()

    expect(chatVoice.controller.state()).toMatchObject({modelReady: false, status: 'error'})
    expect(chatVoice.controller.canPrepare()).toBe(true)

    await chatVoice.controller.prepare()
    await chatVoice.controller.prepare()

    expect(client.initialize).toHaveBeenCalledTimes(2)
    expect(client.dispose).toHaveBeenCalledOnce()
    expect(chatVoice.controller.state().status).toBe('ready')
    chatVoice.dispose()
  })

  it('should report unexpected initialization failures', async () => {
    const error = new Error('Initialization crashed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const client = createClient()
    vi.mocked(client.initialize).mockRejectedValueOnce(error)
    const {runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()

    expect(consoleError).toHaveBeenCalledWith('Unexpected chat voice failure', error)
    expect(chatVoice.controller.state()).toMatchObject({modelReady: false, status: 'error'})
    chatVoice.dispose()
    consoleError.mockRestore()
  })

  it('should ignore an initialization rejection after disposal', async () => {
    let rejectInitialization: (error: Error) => void = () => undefined
    const client = createClient()
    vi.mocked(client.initialize).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectInitialization = reject
        }),
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const {runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    const preparation = chatVoice.controller.prepare()
    chatVoice.dispose()
    rejectInitialization(new Error('Late initialization failure'))
    await preparation

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('should keep an answer queued until the voice model is ready', async () => {
    const client = createClient()
    const {players, runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    chatVoice.controller.arm()
    const speech = chatVoice.controller.speak('준비 뒤 재생')
    chatVoice.controller.finish()
    expect(client.generateStream).not.toHaveBeenCalled()

    await chatVoice.controller.prepare()
    await speech

    expect(client.generateStream).toHaveBeenCalledWith({
      text: '준비 뒤 재생',
      voice: {id: 'Yuna', kind: 'preset'},
    })
    expect(players[0]?.enqueue).toHaveBeenCalledTimes(1)
    chatVoice.dispose()
  })

  it('should share an in-flight model preparation with concurrent callers', async () => {
    let releaseInitialization: () => void = () => undefined
    const initialization = new Promise<void>((resolve) => {
      releaseInitialization = resolve
    })
    const client = createClient()
    vi.mocked(client.initialize).mockImplementationOnce(async () => {
      await initialization
      return successResult(undefined)
    })
    const {runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    const firstPreparation = chatVoice.controller.prepare()
    const secondPreparation = chatVoice.controller.prepare()

    expect(secondPreparation).toBe(firstPreparation)
    expect(client.initialize).toHaveBeenCalledOnce()

    releaseInitialization()
    await Promise.all([firstPreparation, secondPreparation])

    expect(chatVoice.controller.state().status).toBe('ready')
    chatVoice.dispose()
  })
})
