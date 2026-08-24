import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {type ChatVoiceController, type ChatVoiceRuntime, useChatVoice} from '../index'
import {
  type CreateSupertonicAudioPlayerOptions,
  type SupertonicAudioPlayer,
  type SupertonicClient,
} from '../../supertonic'
import {failureResult, successResult} from '../../result'

const SAMPLE_RATE = 24_000

interface ChatVoiceTestRoot {
  readonly controller: ChatVoiceController
  readonly dispose: () => void
}

interface TestAudioPlayer extends SupertonicAudioPlayer {
  readonly end: () => void
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

describe('useChatVoice', () => {
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

  it('should play an answer with the requested preset voice', async () => {
    const client = createClient()
    const {runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()
    chatVoice.controller.arm()
    await chatVoice.controller.speak('다른 목소리', 'M1')

    expect(client.generateStream).toHaveBeenCalledWith({
      text: '다른 목소리',
      voice: {id: 'M1', kind: 'preset'},
    })
    chatVoice.dispose()
  })

  it('should stop current playback when the next user message arms audio', async () => {
    const client = createClient()
    const {players, runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()
    chatVoice.controller.arm()
    await chatVoice.controller.speak('첫 번째 답변')
    chatVoice.controller.finish()
    chatVoice.controller.arm()

    expect(players[0]?.dispose).toHaveBeenCalledTimes(1)
    expect(chatVoice.controller.isPlaying()).toBe(false)
    expect(players).toHaveLength(2)
    chatVoice.dispose()
  })

  it('should stop playback from the visible stop action', async () => {
    const client = createClient()
    const {players, runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()
    chatVoice.controller.arm()
    await chatVoice.controller.speak('중지할 답변')
    chatVoice.controller.stop()

    expect(players[0]?.dispose).toHaveBeenCalledTimes(1)
    expect(chatVoice.controller.isPlaying()).toBe(false)
    expect(chatVoice.controller.statusMessage()).toBe('답변 음성 재생을 중지했어요.')
    chatVoice.dispose()
  })

  it('should cancel active generation when playback is stopped', async () => {
    let releaseGeneration: () => void = () => undefined
    const generationCancelled = new Promise<void>((resolve) => {
      releaseGeneration = resolve
    })
    const client = createClient()
    vi.mocked(client.generateStream).mockImplementationOnce(async function* generateStream() {
      await generationCancelled
      yield successResult({audio: createAudio(), type: 'complete' as const})
    })
    const {players, runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()
    chatVoice.controller.arm()
    const speech = chatVoice.controller.speak('생성 중인 답변')
    chatVoice.controller.stop()

    expect(client.cancelGeneration).toHaveBeenCalledTimes(1)
    expect(players[0]?.dispose).toHaveBeenCalledTimes(1)
    releaseGeneration()
    await speech
    chatVoice.dispose()
  })

  it('should expose voice generation until the first audio chunk is ready', async () => {
    let releaseChunk: () => void = () => undefined
    const chunkReady = new Promise<void>((resolve) => {
      releaseChunk = resolve
    })
    const client = createClient()
    vi.mocked(client.generateStream).mockImplementationOnce(async function* generateStream() {
      await chunkReady
      yield successResult({audio: createAudioChunk(), type: 'chunk' as const})
      yield successResult({audio: createAudio(), type: 'complete' as const})
    })
    const {runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()
    chatVoice.controller.arm()
    const speech = chatVoice.controller.speak('생성 상태 확인')

    expect(chatVoice.controller.isGenerating()).toBe(true)
    expect(chatVoice.controller.isPlaying()).toBe(false)
    releaseChunk()
    await speech
    chatVoice.controller.finish()

    expect(chatVoice.controller.isGenerating()).toBe(false)
    expect(chatVoice.controller.isPlaying()).toBe(true)
    chatVoice.dispose()
  })

  it('should stop queued audio when generation fails after a chunk', async () => {
    const client = createClient()
    vi.mocked(client.generateStream).mockImplementationOnce(async function* generateStream() {
      yield successResult({audio: createAudioChunk(), type: 'chunk' as const})
      yield failureResult({
        code: 'worker-failed',
        detail: '음성 생성 실패',
        phase: 'generate',
        retryable: true,
      })
    })
    const {players, runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()
    chatVoice.controller.arm()
    await chatVoice.controller.speak('실패할 답변')

    expect(players[0]?.enqueue).toHaveBeenCalledTimes(1)
    expect(players[0]?.dispose).toHaveBeenCalledTimes(1)
    expect(players[0]?.finish).not.toHaveBeenCalled()
    expect(chatVoice.controller.isPlaying()).toBe(false)
    chatVoice.dispose()
  })

  it('should settle queued speech when the active generation fails', async () => {
    let releaseFailure: () => void = () => undefined
    const failureReady = new Promise<void>((resolve) => {
      releaseFailure = resolve
    })
    const client = createClient()
    vi.mocked(client.generateStream).mockImplementationOnce(async function* generateStream() {
      await failureReady
      yield failureResult({
        code: 'worker-failed',
        detail: '음성 생성 실패',
        phase: 'generate',
        retryable: true,
      })
    })
    const {runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()
    chatVoice.controller.arm()
    const activeSpeech = chatVoice.controller.speak('실패할 문장')
    const queuedSpeech = chatVoice.controller.speak('대기 중인 문장')
    releaseFailure()

    await Promise.all([activeSpeech, queuedSpeech])

    expect(client.generateStream).toHaveBeenCalledOnce()
    expect(chatVoice.controller.state().status).toBe('error')
    chatVoice.dispose()
  })

  it('should preserve sentence order in one continuous audio queue', async () => {
    let releaseFirstSentence: () => void = () => undefined
    let releaseSecondSentence: () => void = () => undefined
    const firstSentenceReady = new Promise<void>((resolve) => {
      releaseFirstSentence = resolve
    })
    const secondSentenceReady = new Promise<void>((resolve) => {
      releaseSecondSentence = resolve
    })
    const client = createClient()
    vi.mocked(client.generateStream)
      .mockImplementationOnce(async function* firstSentence() {
        await firstSentenceReady
        yield successResult({audio: createAudioChunk(), type: 'chunk' as const})
        yield successResult({audio: createAudio(), type: 'complete' as const})
      })
      .mockImplementationOnce(async function* secondSentence() {
        await secondSentenceReady
        yield successResult({audio: createAudioChunk(), type: 'chunk' as const})
        yield successResult({audio: createAudio(), type: 'complete' as const})
      })
    const {players, runtime} = createRuntime(client)
    const chatVoice = createTestRoot(runtime)

    await chatVoice.controller.prepare()
    chatVoice.controller.arm()
    const firstSpeech = chatVoice.controller.speak('첫 문장입니다.')
    const secondSpeech = chatVoice.controller.speak('두 번째 문장입니다.')
    let secondSpeechCompleted = false
    secondSpeech.then(() => {
      secondSpeechCompleted = true
    })
    chatVoice.controller.finish()
    releaseFirstSentence()
    await firstSpeech
    await vi.waitFor(() => expect(client.generateStream).toHaveBeenCalledTimes(2))

    expect(secondSpeechCompleted).toBe(false)

    releaseSecondSentence()
    await secondSpeech
    await vi.waitFor(() => expect(players[0]?.finish).toHaveBeenCalledTimes(1))

    expect(client.generateStream).toHaveBeenNthCalledWith(1, {
      text: '첫 문장입니다.',
      voice: {id: 'Yuna', kind: 'preset'},
    })
    expect(client.generateStream).toHaveBeenNthCalledWith(2, {
      text: '두 번째 문장입니다.',
      voice: {id: 'Yuna', kind: 'preset'},
    })
    expect(players).toHaveLength(1)
    expect(players[0]?.enqueue).toHaveBeenCalledTimes(2)
    chatVoice.dispose()
  })
})
