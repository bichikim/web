/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {type ChatController, type ChatMessage, useChat} from '../../features/chat'
import {loadCalendarPromptContext} from '../../features/calendar'
import {
  type ChatVoiceController,
  createStreamingSpeechBuffer,
  type StreamingSpeechBuffer,
  useChatVoice,
} from '../../features/chat-voice'
import {
  appendSpeechTranscript,
  type SpeechActivity,
  type SpeechToTextController,
  useSpeechToText,
  type UseSpeechToTextProps,
} from '../../features/speech-to-text'
import {getTextModel} from '../../features/text-generation'
import ChatRoom from '../ChatRoom'
import {ChatComposer} from '../chat-room/Composer'
import {ContextSidebar} from '../chat-room/ContextSidebar'
import {ChatHeader} from '../chat-room/Header'
import {MAXIMUM_DRAFT_LENGTH} from '../chat-room/shared'
import {ChatTranscript} from '../chat-room/Transcript'

vi.mock('../../features/chat', () => ({useChat: vi.fn()}))
vi.mock('../../features/calendar', () => ({loadCalendarPromptContext: vi.fn()}))
vi.mock('../../features/chat-voice', () => ({
  createStreamingSpeechBuffer: vi.fn(),
  useChatVoice: vi.fn(),
}))
vi.mock('../../features/speech-to-text', () => ({
  appendSpeechTranscript: vi.fn(),
  useSpeechToText: vi.fn(),
}))
vi.mock('../../features/text-generation', () => ({getTextModel: vi.fn()}))
vi.mock('../chat-room/Composer', () => ({ChatComposer: vi.fn()}))
vi.mock('../chat-room/ContextSidebar', () => ({ContextSidebar: vi.fn()}))
vi.mock('../chat-room/Header', () => ({ChatHeader: vi.fn()}))
vi.mock('../chat-room/Transcript', () => ({ChatTranscript: vi.fn()}))

interface TestControls {
  readonly setActivity: (activity: SpeechActivity) => void
  readonly setAnswerDraft: ChatController['answerDraft'] extends () => infer Value
    ? (value: Value) => void
    : never
  readonly setBusy: (isBusy: boolean) => void
  readonly setCanSend: (canSend: boolean) => void
  readonly setDraft: (draft: string) => void
  readonly setMessages: (messages: ReadonlyArray<ChatMessage>) => void
  readonly setStreamingText: (text: string) => void
}

let chat: ChatController
let composerProps: Parameters<typeof ChatComposer>[0]
let controls: TestControls
let headerProps: Parameters<typeof ChatHeader>[0]
let sidebarProps: Parameters<typeof ContextSidebar>[0]
let speech: SpeechToTextController
let speechBuffer: StreamingSpeechBuffer
let speechProps: UseSpeechToTextProps
let transcriptProps: Parameters<typeof ChatTranscript>[0]
let voice: ChatVoiceController

const resolved = () => Promise.resolve()

const createControllers = () => {
  const [activity, setActivity] = createSignal<SpeechActivity>('idle')
  const [answerDraft, setAnswerDraft] =
    createSignal<ReturnType<ChatController['answerDraft']>>(null)
  const [canSend, setCanSend] = createSignal(true)
  const [isBusy, setBusy] = createSignal(false)
  const [draft, setDraft] = createSignal('draft')
  const [messages, setMessages] = createSignal<ReadonlyArray<ChatMessage>>([])
  const [modelId] = createSignal<'qwen-4b'>('qwen-4b')
  const [streamingText, setStreamingText] = createSignal('')

  chat = {
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
  voice = {
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
  speech = {
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
  speechBuffer = {
    flush: vi.fn(() => null),
    reset: vi.fn(),
    update: vi.fn(() => []),
  }
  controls = {
    setActivity,
    setAnswerDraft,
    setBusy,
    setCanSend,
    setDraft,
    setMessages,
    setStreamingText,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  createControllers()
  vi.mocked(useChat).mockReturnValue(chat)
  vi.mocked(loadCalendarPromptContext).mockResolvedValue(null)
  vi.mocked(useChatVoice).mockReturnValue(voice)
  vi.mocked(createStreamingSpeechBuffer).mockReturnValue(speechBuffer)
  vi.mocked(useSpeechToText).mockImplementation((props) => {
    speechProps = props ?? {}
    return speech
  })
  vi.mocked(appendSpeechTranscript).mockImplementation(
    (draft, transcript) => `${draft}${transcript}`,
  )
  vi.mocked(getTextModel).mockReturnValue({
    description: 'Local model',
    downloadSize: '1 GB',
    id: 'qwen-4b',
    label: 'Qwen',
  })
  vi.mocked(ChatHeader).mockImplementation((props) => {
    headerProps = props
    return null
  })
  vi.mocked(ChatComposer).mockImplementation((props) => {
    composerProps = props
    return null
  })
  vi.mocked(ContextSidebar).mockImplementation((props) => {
    sidebarProps = props
    return null
  })
  vi.mocked(ChatTranscript).mockImplementation((props) => {
    transcriptProps = props
    return (
      <div
        data-testid="message-list"
        ref={(element) => {
          element.scrollTo = vi.fn()
          props.setMessageList(element)
        }}
      />
    )
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChatRoom', () => {
  it.each(['model', 'clear'] as const)(
    'should discard pending calendar context after %s changes and allow a new send',
    async (change) => {
      const deferred = Promise.withResolvers<string | null>()
      vi.mocked(loadCalendarPromptContext).mockReturnValueOnce(deferred.promise)
      render(() => <ChatRoom />)
      composerProps.onSend()
      composerProps.onSend()
      expect(loadCalendarPromptContext).toHaveBeenCalledOnce()

      if (change === 'model') {
        headerProps.onModelChange('qwen-2b')
        headerProps.onModelChange('qwen-4b')
      } else {
        sidebarProps.onClear()
      }
      deferred.resolve('obsolete context')
      await deferred.promise
      expect(chat.send).not.toHaveBeenCalled()

      composerProps.onSend()
      await waitFor(() => expect(chat.send).toHaveBeenCalledOnce())
      expect(chat.send).toHaveBeenCalledWith({refineAnswer: true})
    },
  )

  it('should discard a recording completion after starting a new conversation', async () => {
    const deferred = Promise.withResolvers<void>()
    vi.mocked(speech.stopRecording).mockReturnValue(deferred.promise)
    controls.setActivity('recording')
    render(() => <ChatRoom />)
    composerProps.onSend()
    sidebarProps.onClear()
    deferred.resolve()
    await deferred.promise
    expect(loadCalendarPromptContext).not.toHaveBeenCalled()
    expect(chat.send).not.toHaveBeenCalled()
  })

  it('should wire controllers and apply transcript limits and settings', async () => {
    render(() => <ChatRoom />)

    expect(useChat).toHaveBeenCalledWith({modelId: 'qwen-4b'})
    expect(createStreamingSpeechBuffer).toHaveBeenCalledWith({locale: 'ko'})
    expect(useSpeechToText).toHaveBeenCalledWith(
      expect.objectContaining({accumulateText: false, modelId: 'whisper-base'}),
    )
    expect(headerProps.modelId).toBe('qwen-4b')
    expect(sidebarProps.modelLabel).toBe('Qwen')
    expect(composerProps.chat).toBe(chat)
    expect(transcriptProps.voice).toBe(voice)

    composerProps.onEndpointingChange(true)
    expect(composerProps.endpointing).toBe(true)

    vi.mocked(appendSpeechTranscript).mockReturnValue('x'.repeat(MAXIMUM_DRAFT_LENGTH + 10))
    speechProps.onTranscript?.(' transcript')
    expect(appendSpeechTranscript).toHaveBeenCalledWith('draft', ' transcript')
    expect(chat.setDraft).toHaveBeenCalledWith('x'.repeat(MAXIMUM_DRAFT_LENGTH))

    controls.setCanSend(false)
    composerProps.onSend()
    expect(chat.send).not.toHaveBeenCalled()

    controls.setCanSend(true)
    sidebarProps.onDisableRefiningChange(true)
    sidebarProps.onSpeakBeforeRefiningChange(true)
    expect(sidebarProps.disableRefining).toBe(true)
    expect(sidebarProps.speakBeforeRefining).toBe(true)
    composerProps.onSend()
    expect(voice.arm).toHaveBeenCalledOnce()
    expect(speechBuffer.reset).toHaveBeenCalledOnce()
    await waitFor(() => expect(chat.send).toHaveBeenCalledWith({refineAnswer: false}))
  })

  it('should handle recording, preparation, model changes, clearing, and speech toggles', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(() => <ChatRoom />)

    controls.setActivity('recording')
    expect(headerProps.disabled).toBe(true)
    controls.setActivity('idle')
    controls.setBusy(true)
    expect(headerProps.disabled).toBe(true)
    controls.setBusy(false)
    controls.setActivity('recording')
    composerProps.onSend()
    await waitFor(() => expect(speech.stopRecording).toHaveBeenCalledOnce())
    await waitFor(() => expect(chat.send).toHaveBeenCalledWith({refineAnswer: true}))

    controls.setActivity('processing')
    composerProps.onSend()
    expect(chat.send).toHaveBeenCalledOnce()

    sidebarProps.onPrepare()
    expect(chat.prepare).toHaveBeenCalledOnce()
    expect(voice.prepare).toHaveBeenCalledOnce()

    headerProps.onModelChange('qwen-2b')
    expect(voice.stop).toHaveBeenCalledOnce()
    expect(speechBuffer.reset).toHaveBeenCalledTimes(2)
    expect(chat.selectModel).toHaveBeenCalledWith('qwen-2b')

    sidebarProps.onClear()
    expect(voice.stop).toHaveBeenCalledTimes(2)
    expect(chat.clear).toHaveBeenCalledOnce()

    controls.setActivity('recording')
    vi.mocked(speech.stopRecording).mockRejectedValueOnce(new Error('stop failed'))
    composerProps.onSpeechToggle()
    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(new Error('stop failed')))

    controls.setActivity('idle')
    vi.mocked(speech.startRecording).mockRejectedValueOnce(new Error('start failed'))
    composerProps.onSpeechToggle()
    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(new Error('start failed')))

    vi.mocked(voice.prepare).mockRejectedValueOnce(new Error('prepare failed'))
    sidebarProps.onPrepare()
    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(new Error('prepare failed')))
  })

  it('should report a stop failure without sending the recording draft', async () => {
    const error = new Error('stop failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(speech.stopRecording).mockRejectedValueOnce(error)
    controls.setActivity('recording')
    render(() => <ChatRoom />)

    composerProps.onSend()

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(error))
    expect(chat.send).not.toHaveBeenCalled()
  })

  it('should speak completed streaming text and flush each answer once', async () => {
    vi.mocked(speechBuffer.update).mockReturnValue(['first sentence', 'second sentence'])
    vi.mocked(speechBuffer.flush).mockReturnValue('remaining text')
    render(() => <ChatRoom />)
    sidebarProps.onSpeakBeforeRefiningChange(true)
    composerProps.onSend()

    controls.setStreamingText('streaming answer')
    controls.setAnswerDraft({content: 'final answer', id: 'answer-1'})

    await waitFor(() => expect(speechBuffer.update).toHaveBeenCalledWith('streaming answer'))
    expect(voice.speak).toHaveBeenCalledWith('first sentence')
    expect(voice.speak).toHaveBeenCalledWith('second sentence')
    expect(speechBuffer.flush).toHaveBeenCalledWith('streaming answer')
    expect(voice.speak).toHaveBeenCalledWith('remaining text')
    expect(voice.finish).toHaveBeenCalledOnce()

    controls.setStreamingText('streaming answer updated')
    await Promise.resolve()
    expect(voice.finish).toHaveBeenCalledOnce()
  })

  it('should flush final answer content and skip empty buffered text', async () => {
    render(() => <ChatRoom />)
    sidebarProps.onSpeakBeforeRefiningChange(true)
    composerProps.onSend()

    controls.setAnswerDraft({content: 'final answer', id: 'answer-2'})

    await waitFor(() => expect(speechBuffer.flush).toHaveBeenCalledWith('final answer'))
    expect(voice.speak).not.toHaveBeenCalled()
    expect(voice.finish).toHaveBeenCalledOnce()
  })

  it('should speak only each latest completed assistant message once', async () => {
    render(() => <ChatRoom />)

    controls.setMessages([{content: 'user message', id: 'user-1', role: 'user'}])
    await Promise.resolve()
    expect(voice.speak).not.toHaveBeenCalled()

    controls.setMessages([{content: 'assistant message', id: 'assistant-1', role: 'assistant'}])
    await waitFor(() => expect(voice.speak).toHaveBeenCalledWith('assistant message'))
    expect(voice.finish).toHaveBeenCalledOnce()

    controls.setDraft('updated draft')
    await Promise.resolve()
    expect(voice.speak).toHaveBeenCalledOnce()
  })
})
