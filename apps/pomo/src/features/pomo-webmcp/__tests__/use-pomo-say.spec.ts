/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {type ChatVoiceController, type ChatVoiceRuntime, useChatVoice} from '../../chat-voice'
import {
  type CreateSupertonicAudioPlayerOptions,
  successResult,
  type SupertonicAudioPlayer,
  type SupertonicClient,
} from '../../supertonic'
import {usePSay} from '../use-pomo-say'

vi.mock('../../chat-voice', () => ({
  useChatVoice: vi.fn(),
}))

interface RegisteredTool {
  readonly execute: (input: unknown) => Promise<unknown>
}

const createModelContext = () => {
  let tool: RegisteredTool | undefined
  const registerTool = vi.fn(async (registeredTool: RegisteredTool) => {
    tool = registeredTool
  })
  Reflect.set(document, 'modelContext', {registerTool})

  return {
    getTool() {
      if (tool === undefined) {
        throw new Error('Expected pomo_say to be registered.')
      }

      return tool
    },
    registerTool,
  }
}

const createVoice = (): ChatVoiceController => ({
  activeViseme: () => 'rest',
  arm: vi.fn(),
  canPrepare: () => true,
  finish: vi.fn(async () => undefined),
  isGenerating: () => false,
  isPlaying: () => true,
  prepare: vi.fn(async () => undefined),
  speak: vi.fn(async () => undefined),
  state: vi.fn<ChatVoiceController['state']>(() => ({
    message: '말하는 중',
    phase: 'playing',
    status: 'speaking',
  })),
  statusMessage: () => '말하는 중',
  stop: vi.fn(),
})

interface TestAudioPlayer extends SupertonicAudioPlayer {
  readonly end: () => void
}

const createAudio = () => ({
  generationTime: 100,
  sampleRate: 24_000,
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
  initialize: vi.fn(async () => successResult(undefined)),
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

afterEach(() => {
  Reflect.deleteProperty(document, 'modelContext')
  vi.clearAllMocks()
})

describe('usePSay', () => {
  it('should keep newer speech text while a superseded generation settles', async () => {
    let releaseFirstGeneration: () => void = () => undefined
    const firstGeneration = new Promise<void>((resolve) => {
      releaseFirstGeneration = resolve
    })
    const client = createClient()
    vi.mocked(client.generateStream)
      .mockImplementationOnce(async function* firstSpeech() {
        await firstGeneration
        yield successResult({audio: createAudio(), type: 'complete' as const})
      })
      .mockImplementationOnce(async function* secondSpeech() {
        yield successResult({audio: createAudioChunk(), type: 'chunk' as const})
        yield successResult({audio: createAudio(), type: 'complete' as const})
      })
    const {players, runtime} = createRuntime(client)
    const actualChatVoice =
      await vi.importActual<typeof import('../../chat-voice')>('../../chat-voice')
    vi.mocked(useChatVoice).mockImplementationOnce(() => actualChatVoice.useChatVoice({runtime}))
    const modelContext = createModelContext()
    const {cleanup, result} = renderHook(() => usePSay({onBeforeSpeech: vi.fn()}))
    await vi.waitFor(() => expect(modelContext.registerTool).toHaveBeenCalledOnce())
    const tool = modelContext.getTool()

    const supersededCall = tool.execute({text: '첫 번째 소식'})
    await vi.waitFor(() => expect(client.generateStream).toHaveBeenCalledOnce())
    const activeCall = tool.execute({text: '두 번째 소식'})
    await vi.waitFor(() => expect(client.cancelGeneration).toHaveBeenCalledOnce())
    await Promise.resolve()

    expect(result.speechText()).toBe('두 번째 소식')

    releaseFirstGeneration()
    await expect(supersededCall).rejects.toMatchObject({name: 'AbortError'})
    await vi.waitFor(() => expect(client.generateStream).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(players[1]?.finish).toHaveBeenCalledOnce())

    expect(result.speechText()).toBe('두 번째 소식')

    players[1]?.end()
    await expect(activeCall).resolves.toEqual({spoken: true, voice: 'Yuna'})
    expect(result.speechText()).toBeNull()
    cleanup()
  })

  it('should cancel a superseded tool call without finishing the newer speech', async () => {
    let completeFirst: () => void = () => undefined
    let completeSecond: () => void = () => undefined
    const firstSpeech = new Promise<void>((resolve) => {
      completeFirst = resolve
    })
    const secondSpeech = new Promise<void>((resolve) => {
      completeSecond = resolve
    })
    const modelContext = createModelContext()
    const voice = createVoice()
    vi.mocked(voice.speak).mockImplementation((text) =>
      text === '첫 번째 소식' ? firstSpeech : secondSpeech,
    )
    vi.mocked(useChatVoice).mockReturnValue(voice)
    const onBeforeSpeech = vi.fn()
    const {cleanup, result} = renderHook(() => usePSay({onBeforeSpeech}))
    await vi.waitFor(() => expect(modelContext.registerTool).toHaveBeenCalledOnce())
    const tool = modelContext.getTool()

    const supersededCall = tool.execute({text: '첫 번째 소식'})
    const activeCall = tool.execute({text: '두 번째 소식'})
    completeFirst()

    await expect(supersededCall).rejects.toMatchObject({name: 'AbortError'})
    expect(voice.finish).not.toHaveBeenCalled()
    expect(result.speechText()).toBe('두 번째 소식')

    completeSecond()
    await expect(activeCall).resolves.toEqual({spoken: true, voice: 'Yuna'})
    expect(voice.finish).toHaveBeenCalledOnce()
    expect(onBeforeSpeech).toHaveBeenCalledTimes(2)
    cleanup()
  })

  it('should invalidate active speech when the user stops playback', async () => {
    let completeSpeech: () => void = () => undefined
    const speech = new Promise<void>((resolve) => {
      completeSpeech = resolve
    })
    const modelContext = createModelContext()
    const voice = createVoice()
    vi.mocked(voice.speak).mockReturnValueOnce(speech)
    vi.mocked(useChatVoice).mockReturnValue(voice)
    const {cleanup, result} = renderHook(() => usePSay({onBeforeSpeech: vi.fn()}))
    await vi.waitFor(() => expect(modelContext.registerTool).toHaveBeenCalledOnce())

    const activeCall = modelContext.getTool().execute({text: '중지할 소식'})
    result.stop()
    completeSpeech()

    await expect(activeCall).rejects.toMatchObject({name: 'AbortError'})
    expect(result.speechText()).toBeNull()
    expect(voice.stop).toHaveBeenCalledOnce()
    expect(voice.finish).not.toHaveBeenCalled()
    cleanup()
  })

  it('should clear active speech text when voice generation fails', async () => {
    const modelContext = createModelContext()
    const voice = createVoice()
    vi.mocked(voice.state)
      .mockReturnValueOnce({message: '준비됨', status: 'ready'})
      .mockReturnValueOnce({
        message: '음성 생성 실패',
        modelReady: true,
        status: 'error',
      })
    vi.mocked(useChatVoice).mockReturnValue(voice)
    const {cleanup, result} = renderHook(() => usePSay({onBeforeSpeech: vi.fn()}))
    await vi.waitFor(() => expect(modelContext.registerTool).toHaveBeenCalledOnce())

    const failedCall = modelContext.getTool().execute({text: '실패할 소식'})

    await expect(failedCall).rejects.toThrow('음성 생성 실패')
    expect(result.speechText()).toBeNull()
    cleanup()
  })

  it('should keep the tool call pending until audio playback ends', async () => {
    let completePlayback: () => void = () => undefined
    const playback = new Promise<void>((resolve) => {
      completePlayback = resolve
    })
    const modelContext = createModelContext()
    const voice = createVoice()
    vi.mocked(voice.finish).mockReturnValueOnce(playback)
    vi.mocked(useChatVoice).mockReturnValue(voice)
    const {cleanup} = renderHook(() => usePSay({onBeforeSpeech: vi.fn()}))
    await vi.waitFor(() => expect(modelContext.registerTool).toHaveBeenCalledOnce())

    const toolCall = modelContext.getTool().execute({text: '끝까지 읽을 소식'})
    let toolCompleted = false
    toolCall.then(() => {
      toolCompleted = true
    })
    await vi.waitFor(() => expect(voice.finish).toHaveBeenCalledOnce())

    expect(toolCompleted).toBe(false)

    completePlayback()
    await expect(toolCall).resolves.toEqual({spoken: true, voice: 'Yuna'})
    cleanup()
  })
})
