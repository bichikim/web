/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import type {ChatVoiceController} from '../features/chat-voice'
import {useLazyChatVoice} from '../features/chat-voice/lazy'
import {usePSay} from '../features/pomo-webmcp/use-pomo-say'

vi.mock('../features/chat-voice/lazy', () => ({
  useLazyChatVoice: vi.fn(),
}))

const createVoice = (): ChatVoiceController => ({
  activeViseme: () => 'rest',
  arm: vi.fn(),
  canPrepare: () => true,
  finish: vi.fn(async () => undefined),
  isGenerating: () => false,
  isPlaying: () => false,
  prepare: vi.fn(async () => undefined),
  speak: vi.fn(async () => undefined),
  state: vi.fn<ChatVoiceController['state']>(() => ({
    message: '생성 중',
    phase: 'generating',
    status: 'speaking',
  })),
  statusMessage: () => '생성 중',
  stop: vi.fn(),
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should show speech text while Supertonic is generating audio', async () => {
  let completeSpeech: () => void = () => undefined
  const speech = new Promise<void>((resolve) => {
    completeSpeech = resolve
  })
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [isGenerating, setIsGenerating] = createSignal(true)
  const voice = {
    ...createVoice(),
    isGenerating: () => isGenerating(),
    isPlaying: () => isPlaying(),
  }
  vi.mocked(voice.speak).mockReturnValueOnce(speech)
  vi.mocked(useLazyChatVoice).mockReturnValue(voice)
  const {cleanup, result} = renderHook(() => usePSay({onBeforeSpeech: vi.fn()}))

  const activeCall = result.speak({text: '말풍선에 먼저 보여야 하는 문장'})

  await vi.waitFor(() => expect(voice.arm).toHaveBeenCalledOnce())
  expect(result.speechText()).toBe('말풍선에 먼저 보여야 하는 문장')

  setIsGenerating(false)
  setIsPlaying(true)
  completeSpeech()
  await expect(activeCall).resolves.toBeUndefined()
  cleanup()
})
