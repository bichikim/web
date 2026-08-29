/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type ChatController} from '../../../features/chat'
import {type SpeechActivity, type SpeechToTextController} from '../../../features/speech-to-text'
import {ChatComposer} from '../Composer'
import {MAXIMUM_DRAFT_LENGTH} from '../shared'

interface Controls {
  readonly setActivity: (activity: SpeechActivity) => void
  readonly setBusy: (busy: boolean) => void
  readonly setCanSend: (canSend: boolean) => void
  readonly setError: (error: string | null) => void
  readonly setModelLoading: (loading: boolean) => void
  readonly setReady: (ready: boolean) => void
  readonly setSupported: (supported: boolean | null) => void
}

let chat: ChatController
let controls: Controls
let speech: SpeechToTextController

beforeEach(() => {
  const [activity, setActivity] = createSignal<SpeechActivity>('idle')
  const [busy, setBusy] = createSignal(false)
  const [canSend, setCanSend] = createSignal(true)
  const [draft, setDraft] = createSignal('draft')
  const [error, setError] = createSignal<string | null>(null)
  const [modelLoading, setModelLoading] = createSignal(false)
  const [ready, setReady] = createSignal(true)
  const [supported, setSupported] = createSignal<boolean | null>(true)

  chat = {
    answerDraft: () => null,
    canClear: () => true,
    canPrepare: () => true,
    canSend,
    clear: vi.fn(),
    contextTokens: () => 0,
    draft,
    isBusy: busy,
    isModelReady: ready,
    messages: () => [],
    modelId: () => 'qwen-4b',
    prepare: vi.fn(),
    selectModel: vi.fn(),
    send: vi.fn(),
    setDraft: vi.fn(setDraft),
    state: () => ({status: 'ready'}),
    statusMessage: () => 'ready',
    streamingText: () => '',
    summaryCount: () => 0,
  }
  speech = {
    activity,
    backend: () => null,
    elapsedTime: () => 1.25,
    errorMessage: error,
    isSupported: supported,
    modelProgress: () => 42,
    modelState: () =>
      modelLoading() ? {progress: 42, status: 'loading'} : {backend: 'wasm', status: 'ready'},
    setText: vi.fn(),
    startRecording: vi.fn(async () => undefined),
    stopRecording: vi.fn(async () => undefined),
    text: () => '',
    toggleRecording: vi.fn(),
  }
  controls = {
    setActivity,
    setBusy,
    setCanSend,
    setError,
    setModelLoading,
    setReady,
    setSupported,
  }
})

describe('ChatComposer', () => {
  it('should edit and send an idle chat draft with keyboard and form controls', () => {
    const onEndpointingChange = vi.fn()
    const onSend = vi.fn()
    const onSpeechToggle = vi.fn()
    render(() => (
      <ChatComposer
        chat={chat}
        endpointing={false}
        onEndpointingChange={onEndpointingChange}
        onSend={onSend}
        onSpeechToggle={onSpeechToggle}
        speech={speech}
      />
    ))

    const textarea = screen.getByRole('textbox', {name: '메시지'})
    expect(textarea).toHaveAttribute('maxlength', String(MAXIMUM_DRAFT_LENGTH))
    expect(textarea).toHaveAttribute('placeholder', '메시지를 입력하세요')
    fireEvent.input(textarea, {target: {value: 'new draft'}})
    expect(chat.setDraft).toHaveBeenCalledWith('new draft')

    fireEvent.keyDown(textarea, {key: 'Escape'})
    fireEvent.keyDown(textarea, {key: 'Enter', shiftKey: true})
    fireEvent.keyDown(textarea, {isComposing: true, key: 'Enter'})
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.keyDown(textarea, {key: 'Enter'})
    expect(onSend).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', {name: /말끝 감지 후 바로 입력/}))
    expect(onEndpointingChange).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByRole('button', {name: '음성 입력'}))
    expect(onSpeechToggle).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', {name: '보내기'}))
    expect(onSend).toHaveBeenCalledTimes(2)
  })

  it('should present and send a recording with endpointing details', () => {
    controls.setActivity('recording')
    const onEndpointingChange = vi.fn()
    const onSend = vi.fn()
    render(() => (
      <ChatComposer
        chat={chat}
        endpointing
        onEndpointingChange={onEndpointingChange}
        onSend={onSend}
        onSpeechToggle={vi.fn()}
        speech={speech}
      />
    ))

    expect(screen.getByText(/마이크 듣는 중 · 1.3초/)).toHaveTextContent(
      '말끝의 짧은 침묵을 감지하면 입력창에 바로 표시해요.',
    )
    expect(screen.getByRole('button', {name: '마이크 끄기'})).toBeEnabled()
    expect(screen.getByRole('button', {name: '마이크 끄고 보내기'})).toBeEnabled()
    expect(screen.getByRole('button', {name: /말끝 감지 후 바로 입력/})).toBeDisabled()
    fireEvent.click(screen.getByRole('button', {name: '마이크 끄고 보내기'}))
    expect(onSend).toHaveBeenCalledOnce()
  })

  it.each(['checking', 'processing', 'requesting'] as const)(
    'should disable speech controls while %s',
    (activity) => {
      controls.setActivity(activity)
      render(() => (
        <ChatComposer
          chat={chat}
          endpointing={false}
          onEndpointingChange={vi.fn()}
          onSend={vi.fn()}
          onSpeechToggle={vi.fn()}
          speech={speech}
        />
      ))

      expect(screen.getByRole('button', {name: '음성 처리 중…'})).toBeDisabled()
      expect(screen.getByRole('button', {name: '보내기'})).toBeDisabled()
    },
  )

  it('should expose model, support, loading, and error states', () => {
    controls.setReady(false)
    controls.setSupported(null)
    controls.setModelLoading(true)
    controls.setError('microphone failed')
    const view = render(() => (
      <ChatComposer
        chat={chat}
        endpointing={false}
        onEndpointingChange={vi.fn()}
        onSend={vi.fn()}
        onSpeechToggle={vi.fn()}
        speech={speech}
      />
    ))

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '먼저 모델을 준비해 주세요')
    expect(screen.getByRole('button', {name: '음성 입력'})).toBeDisabled()
    expect(screen.getByText('음성 인식 모델 준비 중 · 42%')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('microphone failed')

    controls.setReady(true)
    controls.setBusy(true)
    expect(screen.getByRole('textbox')).toBeDisabled()
    controls.setBusy(false)
    controls.setSupported(false)
    controls.setCanSend(false)
    expect(screen.getByRole('button', {name: '보내기'})).toBeDisabled()
    view.unmount()
  })

  it('should describe recording without endpointing', () => {
    controls.setActivity('recording')
    render(() => (
      <ChatComposer
        chat={chat}
        endpointing={false}
        onEndpointingChange={vi.fn()}
        onSend={vi.fn()}
        onSpeechToggle={vi.fn()}
        speech={speech}
      />
    ))

    expect(screen.getByText(/마이크 듣는 중/)).toHaveTextContent(
      '마이크를 끄면 전체 음성을 인식해요.',
    )
  })
})
