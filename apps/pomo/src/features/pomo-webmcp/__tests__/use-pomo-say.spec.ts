/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import type {ChatVoiceController} from '../../chat-voice'
import {useLazyChatVoice} from '../../chat-voice/lazy'
import {usePSay} from '../use-pomo-say'

vi.mock('../../chat-voice/lazy', () => ({
  useLazyChatVoice: vi.fn(),
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

afterEach(() => {
  Reflect.deleteProperty(document, 'modelContext')
  vi.clearAllMocks()
})

describe('usePSay', () => {
  it('should expose the same one-off speech path to Pomo callers', async () => {
    let completeSpeech: () => void = () => undefined
    const speech = new Promise<void>((resolve) => {
      completeSpeech = resolve
    })
    const [isPlaying, setIsPlaying] = createSignal(false)
    const voice = {...createVoice(), isPlaying}
    vi.mocked(voice.speak).mockReturnValueOnce(speech)
    vi.mocked(useLazyChatVoice).mockReturnValue(voice)
    const {cleanup, result} = renderHook(() => usePSay({onBeforeSpeech: vi.fn()}))

    const activeCall = result.speak({text: '한 번만 들려줄 답변'})

    expect(result.isPreparing()).toBe(true)
    expect(result.speechText()).toBeNull()
    setIsPlaying(true)
    await vi.waitFor(() => expect(result.speechText()).toBe('한 번만 들려줄 답변'))
    expect(result.isPreparing()).toBe(false)
    completeSpeech()
    await expect(activeCall).resolves.toBeUndefined()
    expect(result.speechText()).toBeNull()
    cleanup()
  })

  it('should keep newer speech text while a superseded tool call settles', async () => {
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
    vi.mocked(useLazyChatVoice).mockReturnValue(voice)
    const onBeforeSpeech = vi.fn()
    const {cleanup, result} = renderHook(() => usePSay({onBeforeSpeech}))
    await vi.waitFor(() => expect(modelContext.registerTool).toHaveBeenCalledOnce())
    const tool = modelContext.getTool()

    const supersededCall = tool.execute({text: '첫 번째 소식'})
    await vi.waitFor(() => expect(voice.speak).toHaveBeenCalledWith('첫 번째 소식', undefined))
    const activeCall = tool.execute({text: '두 번째 소식'})
    await vi.waitFor(() => expect(result.speechText()).toBe('두 번째 소식'))
    const supersededRejection = expect(supersededCall).rejects.toMatchObject({
      name: 'AbortError',
    })
    completeFirst()

    await supersededRejection
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
    vi.mocked(useLazyChatVoice).mockReturnValue(voice)
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
    vi.mocked(useLazyChatVoice).mockReturnValue(voice)
    const {cleanup, result} = renderHook(() => usePSay({onBeforeSpeech: vi.fn()}))
    await vi.waitFor(() => expect(modelContext.registerTool).toHaveBeenCalledOnce())

    const failedCall = modelContext.getTool().execute({text: '실패할 소식'})

    await expect(failedCall).rejects.toThrow('음성 생성 실패')
    expect(result.speechText()).toBeNull()
    cleanup()
  })

  it('should reject speech when voice preparation enters an error state', async () => {
    const modelContext = createModelContext()
    const voice = createVoice()
    vi.mocked(voice.state).mockReturnValue({
      message: '음성 준비 실패',
      modelReady: false,
      status: 'error',
    })
    vi.mocked(useLazyChatVoice).mockReturnValue(voice)
    const {cleanup, result} = renderHook(() => usePSay({onBeforeSpeech: vi.fn()}))
    await vi.waitFor(() => expect(modelContext.registerTool).toHaveBeenCalledOnce())

    await expect(modelContext.getTool().execute({text: '준비할 소식'})).rejects.toThrow(
      '음성 준비 실패',
    )
    expect(voice.arm).not.toHaveBeenCalled()
    expect(result.speechText()).toBeNull()
    cleanup()
  })

  it('should report WebMCP registration failures', async () => {
    const error = new Error('registration unavailable')
    const registerTool = vi.fn().mockRejectedValue(error)
    Reflect.set(document, 'modelContext', {registerTool})
    vi.mocked(useLazyChatVoice).mockReturnValue(createVoice())
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const {cleanup} = renderHook(() => usePSay({onBeforeSpeech: vi.fn()}))

    await vi.waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Failed to register the Pomo WebMCP tool.', error),
    )
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
    vi.mocked(useLazyChatVoice).mockReturnValue(voice)
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
