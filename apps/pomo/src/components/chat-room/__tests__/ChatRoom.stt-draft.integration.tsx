/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type ChatController, type ChatMessage, useChat} from '../../../features/chat'
import {type ChatVoiceController, useChatVoice} from '../../../features/chat-voice'
import {
  appendSpeechTranscript,
  type SpeechActivity,
  type SpeechToTextController,
  useSpeechToText,
  type UseSpeechToTextProps,
} from '../../../features/speech-to-text'
import {appendSpeechTranscript as appendTranscript} from '../../../features/speech-to-text/transcript'
import {getTextModel} from '../../../features/text-generation'
import {ChatRoom} from '../ChatRoom'
import {MAXIMUM_DRAFT_LENGTH} from '../shared'
import {useReplySpeech} from '../use-reply-speech'
import {useSend} from '../use-send'

vi.mock('../../../features/chat', () => ({useChat: vi.fn()}))
vi.mock('../../../features/chat-voice', () => ({useChatVoice: vi.fn()}))
vi.mock('../../../features/speech-to-text', () => ({
  appendSpeechTranscript: vi.fn(),
  useSpeechToText: vi.fn(),
}))
vi.mock('../../../features/text-generation', () => ({getTextModel: vi.fn()}))
vi.mock('../Composer', () => ({ChatComposer: vi.fn(() => null)}))
vi.mock('../ContextSidebar', () => ({ContextSidebar: vi.fn(() => null)}))
vi.mock('../Header', () => ({ChatHeader: vi.fn(() => null)}))
vi.mock('../Transcript', () => ({ChatTranscript: vi.fn(() => null)}))
vi.mock('../use-reply-speech', () => ({useReplySpeech: vi.fn()}))
vi.mock('../use-send', () => ({useSend: vi.fn()}))

interface RenderedChatRoom {
  readonly chat: ChatController
  readonly onTranscript: (transcript: string) => void
}

const createChat = (initialDraft: string): ChatController => {
  const [answerDraft] = createSignal<ReturnType<ChatController['answerDraft']>>(null)
  const [canSend] = createSignal(true)
  const [draft, setDraft] = createSignal(initialDraft)
  const [isBusy] = createSignal(false)
  const [messages] = createSignal<ReadonlyArray<ChatMessage>>([])
  const [modelId] = createSignal<'qwen-4b'>('qwen-4b')
  const [streamingText] = createSignal('')

  return {
    answerDraft,
    canClear: () => true,
    canPrepare: () => true,
    canSend,
    clear: vi.fn(),
    contextTokens: () => 0,
    draft,
    isBusy,
    isModelReady: () => true,
    messages,
    modelId,
    prepare: vi.fn(),
    selectModel: vi.fn(),
    send: vi.fn(),
    setDraft: vi.fn(setDraft),
    state: () => ({status: 'ready'}),
    statusMessage: () => 'ready',
    streamingText,
    summaryCount: () => 0,
  }
}

const createVoice = (): ChatVoiceController => {
  const resolved = () => Promise.resolve()

  return {
    activeViseme: () => 'rest',
    arm: vi.fn(),
    canPrepare: () => true,
    finish: vi.fn(resolved),
    isGenerating: () => false,
    isPlaying: () => false,
    prepare: vi.fn(resolved),
    speak: vi.fn(resolved),
    state: () => ({message: 'ready', status: 'ready'}),
    statusMessage: () => 'ready',
    stop: vi.fn(),
  }
}

const createSpeechController = (): SpeechToTextController => {
  const [activity] = createSignal<SpeechActivity>('idle')
  const resolved = () => Promise.resolve()

  return {
    activity,
    backend: () => null,
    elapsedTime: () => 0,
    errorMessage: () => null,
    isSupported: () => true,
    modelProgress: () => 100,
    modelState: () => ({backend: 'wasm', status: 'ready'}),
    setText: vi.fn(),
    startRecording: vi.fn(resolved),
    stopRecording: vi.fn(resolved),
    text: () => '',
    toggleRecording: vi.fn(),
  }
}

const renderChatRoom = (initialDraft: string): RenderedChatRoom => {
  const chat = createChat(initialDraft)
  const speech = createSpeechController()
  let speechProps: UseSpeechToTextProps = {}

  vi.mocked(useChat).mockReturnValue(chat)
  vi.mocked(useChatVoice).mockReturnValue(createVoice())
  vi.mocked(appendSpeechTranscript).mockImplementation(appendTranscript)
  vi.mocked(getTextModel).mockReturnValue({
    description: 'Local model',
    downloadSize: '1 GB',
    id: 'qwen-4b',
    label: 'Qwen',
  })
  vi.mocked(useReplySpeech).mockReturnValue({
    reset: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })
  vi.mocked(useSend).mockReturnValue({invalidate: vi.fn(), send: vi.fn(() => Promise.resolve())})
  vi.mocked(useSpeechToText).mockImplementation((props) => {
    speechProps = props ?? {}
    return speech
  })

  render(() => <ChatRoom />)

  return {
    chat,
    onTranscript: (transcript) => speechProps.onTranscript?.(transcript),
  }
}

describe('ChatRoom STT draft callback', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should keep a UTF-16 code-unit limit without splitting a transcript emoji', () => {
    const retainedPrefix = 'a'.repeat(MAXIMUM_DRAFT_LENGTH - 2)
    const {chat, onTranscript} = renderChatRoom(retainedPrefix)

    onTranscript('😀')

    expect(appendSpeechTranscript).toHaveBeenCalledWith(retainedPrefix, '😀')
    expect(chat.draft().isWellFormed()).toBe(true)
    expect(chat.draft()).toBe(`${retainedPrefix} `)
    expect(chat.draft().length).toBe(MAXIMUM_DRAFT_LENGTH - 1)
    expect(chat.draft().length).toBeLessThanOrEqual(MAXIMUM_DRAFT_LENGTH)
  })

  it('should keep a surrogate pair when both code units fit at the limit', () => {
    const retainedPrefix = 'c'.repeat(MAXIMUM_DRAFT_LENGTH - 3)
    const {chat, onTranscript} = renderChatRoom(retainedPrefix)

    onTranscript('😀')

    expect(chat.draft()).toBe(`${retainedPrefix} 😀`)
    expect(chat.draft().length).toBe(MAXIMUM_DRAFT_LENGTH)
    expect(chat.draft().isWellFormed()).toBe(true)
  })

  it('should retain the earlier draft and cap a BMP transcript at 1200 code units', () => {
    const retainedPrefix = 'b'.repeat(MAXIMUM_DRAFT_LENGTH - 2)
    const {chat, onTranscript} = renderChatRoom(retainedPrefix)

    onTranscript('cd')

    expect(chat.draft()).toBe(`${retainedPrefix} c`)
    expect(chat.draft().length).toBe(MAXIMUM_DRAFT_LENGTH)
    expect(chat.draft().length).toBeLessThanOrEqual(MAXIMUM_DRAFT_LENGTH)
  })

  it('should preserve an existing draft when the transcript is empty', () => {
    const existingDraft = 'already drafted text'
    const {chat, onTranscript} = renderChatRoom(existingDraft)

    onTranscript('')

    expect(chat.draft()).toBe(existingDraft)
    expect(chat.setDraft).toHaveBeenCalledWith(existingDraft)
  })
})
