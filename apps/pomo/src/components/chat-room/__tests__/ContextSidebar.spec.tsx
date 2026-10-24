/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type ChatController, type ChatState} from '../../../features/chat'
import {type ChatVoiceController} from '../../../features/chat-voice'
import {ContextSidebar} from '../ContextSidebar'

interface Controls {
  readonly setCanClear: (value: boolean) => void
  readonly setCanPrepare: (value: boolean) => void
  readonly setIsModelReady: (value: boolean) => void
  readonly setIsPlaying: (value: boolean) => void
  readonly setState: (state: ChatState) => void
  readonly setVoiceCanPrepare: (value: boolean) => void
}

let chat: ChatController
let controls: Controls
let voice: ChatVoiceController

beforeEach(() => {
  const [canClear, setCanClear] = createSignal(true)
  const [canPrepare, setCanPrepare] = createSignal(true)
  const [isModelReady, setIsModelReady] = createSignal(false)
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [state, setState] = createSignal<ChatState>({status: 'idle'})
  const [voiceCanPrepare, setVoiceCanPrepare] = createSignal(true)

  chat = {
    answerDraft: () => null,
    canClear,
    canPrepare,
    canSend: () => false,
    clear: vi.fn(),
    contextTokens: () => 1_234,
    draft: () => '',
    isBusy: () => false,
    isModelReady,
    messages: () => [],
    modelId: () => 'qwen-4b',
    prepare: vi.fn(),
    selectModel: vi.fn(),
    send: vi.fn(),
    setDraft: vi.fn(),
    state,
    statusMessage: () => 'chat status',
    streamingText: () => '',
    summaryCount: () => 2,
  }
  voice = {
    activeViseme: () => 'rest',
    arm: vi.fn(),
    canPrepare: voiceCanPrepare,
    finish: vi.fn(async () => undefined),
    isGenerating: () => false,
    isPlaying,
    prepare: vi.fn(async () => undefined),
    speak: vi.fn(async () => undefined),
    state: () => ({message: 'ready', status: 'ready'}),
    statusMessage: () => 'voice status',
    stop: vi.fn(),
  }
  controls = {
    setCanClear,
    setCanPrepare,
    setIsModelReady,
    setIsPlaying,
    setState,
    setVoiceCanPrepare,
  }
})

describe('ContextSidebar', () => {
  it('should prepare a chat model and update answer settings', () => {
    const onDisableRefiningChange = vi.fn()
    const onPrepare = vi.fn()
    const onSpeakBeforeRefiningChange = vi.fn()
    render(() => (
      <ContextSidebar
        chat={chat}
        disableRefining={false}
        modelLabel="Qwen"
        onClear={vi.fn()}
        onDisableRefiningChange={onDisableRefiningChange}
        onPrepare={onPrepare}
        onSpeakBeforeRefiningChange={onSpeakBeforeRefiningChange}
        speakBeforeRefining={false}
        voice={voice}
      />
    ))

    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByText('2회')).toBeInTheDocument()
    expect(screen.getByText('chat status')).toBeInTheDocument()
    expect(screen.getByText('voice status')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: 'Qwen 준비하기'}))
    expect(onPrepare).toHaveBeenCalledOnce()

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])
    expect(onSpeakBeforeRefiningChange).toHaveBeenCalledWith(true)
    expect(onDisableRefiningChange).toHaveBeenCalledWith(true)
  })

  it('should expose loading and disabled chat actions', () => {
    controls.setState({percentage: 50, status: 'loading'})
    controls.setCanPrepare(false)
    controls.setCanClear(false)
    render(() => (
      <ContextSidebar
        chat={chat}
        disableRefining
        modelLabel="Qwen"
        onClear={vi.fn()}
        onDisableRefiningChange={vi.fn()}
        onPrepare={vi.fn()}
        onSpeakBeforeRefiningChange={vi.fn()}
        speakBeforeRefining
        voice={voice}
      />
    ))

    expect(screen.getByRole('button', {name: '모델 준비 중…'})).toBeDisabled()
    expect(screen.getByRole('button', {name: '새 대화'})).toBeDisabled()
    expect(screen.getAllByRole('checkbox')).toEqual(
      expect.arrayContaining([expect.objectContaining({checked: true})]),
    )
  })

  it('should control ready voice playback and clearing', () => {
    const onClear = vi.fn()
    controls.setIsModelReady(true)
    controls.setIsPlaying(true)
    render(() => (
      <ContextSidebar
        chat={chat}
        disableRefining={false}
        modelLabel="Qwen"
        onClear={onClear}
        onDisableRefiningChange={vi.fn()}
        onPrepare={vi.fn()}
        onSpeakBeforeRefiningChange={vi.fn()}
        speakBeforeRefining={false}
        voice={voice}
      />
    ))

    fireEvent.click(screen.getByRole('button', {name: '재생 중지'}))
    expect(voice.stop).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', {name: '답변 음성 다시 준비하기'}))
    expect(voice.prepare).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', {name: '새 대화'}))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('should hide voice preparation when the ready voice cannot prepare', () => {
    controls.setIsModelReady(true)
    controls.setVoiceCanPrepare(false)
    render(() => (
      <ContextSidebar
        chat={chat}
        disableRefining={false}
        modelLabel="Qwen"
        onClear={vi.fn()}
        onDisableRefiningChange={vi.fn()}
        onPrepare={vi.fn()}
        onSpeakBeforeRefiningChange={vi.fn()}
        speakBeforeRefining={false}
        voice={voice}
      />
    ))

    expect(screen.queryByRole('button', {name: '답변 음성 다시 준비하기'})).not.toBeInTheDocument()
  })
})
