/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {type ChatVoiceController, useChatVoice} from '../../chat-voice'
import {usePomoSay} from '../use-pomo-say'

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
  arm: vi.fn(),
  canPrepare: () => true,
  finish: vi.fn(async () => undefined),
  isGenerating: () => false,
  isPlaying: () => true,
  prepare: vi.fn(async () => undefined),
  speak: vi.fn(async () => undefined),
  state: () => ({message: '말하는 중', phase: 'playing', status: 'speaking'}),
  statusMessage: () => '말하는 중',
  stop: vi.fn(),
})

afterEach(() => {
  Reflect.deleteProperty(document, 'modelContext')
  vi.clearAllMocks()
})

describe('usePomoSay', () => {
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
    const {cleanup, result} = renderHook(() => usePomoSay({onBeforeSpeech}))
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
    const {cleanup, result} = renderHook(() => usePomoSay({onBeforeSpeech: vi.fn()}))
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

  it('should keep the tool call pending until audio playback ends', async () => {
    let completePlayback: () => void = () => undefined
    const playback = new Promise<void>((resolve) => {
      completePlayback = resolve
    })
    const modelContext = createModelContext()
    const voice = createVoice()
    vi.mocked(voice.finish).mockReturnValueOnce(playback)
    vi.mocked(useChatVoice).mockReturnValue(voice)
    const {cleanup} = renderHook(() => usePomoSay({onBeforeSpeech: vi.fn()}))
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
