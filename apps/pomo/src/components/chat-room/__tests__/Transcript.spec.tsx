/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type ChatController, type ChatMessage} from '../../../features/chat'
import {type ChatVoiceController} from '../../../features/chat-voice'
import {ChatBubble} from '../Bubble'
import {ProcessedKoreanText} from '../ProcessedKoreanText'
import {ChatTranscript} from '../Transcript'

vi.mock('../Bubble', () => ({ChatBubble: vi.fn()}))
vi.mock('../ProcessedKoreanText', () => ({ProcessedKoreanText: vi.fn()}))

let chat: ChatController
let setBusy: (busy: boolean) => void
let setGenerating: (generating: boolean) => void
let setMessages: (messages: ReadonlyArray<ChatMessage>) => void
let setStreamingText: (text: string) => void
let voice: ChatVoiceController

beforeEach(() => {
  const [busy, updateBusy] = createSignal(false)
  const [generating, updateGenerating] = createSignal(false)
  const [messages, updateMessages] = createSignal<ReadonlyArray<ChatMessage>>([])
  const [streamingText, updateStreamingText] = createSignal('')
  setBusy = updateBusy
  setGenerating = updateGenerating
  setMessages = updateMessages
  setStreamingText = updateStreamingText
  chat = {
    answerDraft: () => null,
    canClear: () => true,
    canPrepare: () => true,
    canSend: () => true,
    clear: vi.fn(),
    contextTokens: () => 0,
    draft: () => '',
    isBusy: busy,
    isModelReady: () => true,
    messages,
    modelId: () => 'qwen-4b',
    prepare: vi.fn(),
    selectModel: vi.fn(),
    send: vi.fn(),
    setDraft: vi.fn(),
    state: () => ({status: 'ready'}),
    statusMessage: () => 'ready',
    streamingText,
    summaryCount: () => 0,
  }
  voice = {
    activeViseme: () => 'rest',
    arm: vi.fn(),
    canPrepare: () => true,
    finish: vi.fn(async () => undefined),
    isGenerating: generating,
    isPlaying: () => false,
    prepare: vi.fn(async () => undefined),
    speak: vi.fn(async () => undefined),
    state: () => ({message: 'ready', status: 'ready'}),
    statusMessage: () => 'ready',
    stop: vi.fn(),
  }
  vi.mocked(ChatBubble).mockImplementation((props) => (
    <div data-generating={String(props.isVoiceGenerating)}>{props.message.content}</div>
  ))
  vi.mocked(ProcessedKoreanText).mockImplementation((props) => <span>{props.text}</span>)
})

describe('ChatTranscript', () => {
  it('should render the empty conversation and assign its message list', () => {
    const setMessageList = vi.fn()
    render(() => <ChatTranscript chat={chat} setMessageList={setMessageList} voice={voice} />)

    expect(screen.getByText('새 대화를 시작해 보세요')).toBeInTheDocument()
    expect(setMessageList).toHaveBeenCalledWith(expect.any(HTMLDivElement), undefined)
  })

  it('should render when a runtime caller omits the message-list ref', () => {
    render(() => <ChatTranscript chat={chat} setMessageList={undefined as never} voice={voice} />)

    expect(screen.getByText('새 대화를 시작해 보세요')).toBeInTheDocument()
  })

  it('should mark only the latest message while voice is generating', () => {
    setGenerating(true)
    setMessages([
      {content: 'first', id: 'message-1', role: 'user'},
      {content: 'second', id: 'message-2', role: 'assistant'},
    ])
    render(() => <ChatTranscript chat={chat} setMessageList={vi.fn()} voice={voice} />)

    expect(screen.getByText('first')).toHaveAttribute('data-generating', 'false')
    expect(screen.getByText('second')).toHaveAttribute('data-generating', 'true')
  })

  it('should handle a generating message list without a latest item', () => {
    const messages: Array<ChatMessage> = [
      {content: 'orphaned message', id: 'message-1', role: 'assistant'},
    ]
    Object.defineProperty(messages, 'at', {value: () => undefined})
    setGenerating(true)
    setMessages(messages)

    render(() => <ChatTranscript chat={chat} setMessageList={vi.fn()} voice={voice} />)

    expect(screen.getByText('orphaned message')).toHaveAttribute('data-generating', 'false')
  })

  it('should render streaming and busy answer states with and without voice generation', () => {
    setMessages([{content: 'first', id: 'message-1', role: 'user'}])
    setStreamingText('streaming answer')
    const view = render(() => <ChatTranscript chat={chat} setMessageList={vi.fn()} voice={voice} />)

    expect(screen.getByText('streaming answer')).toBeInTheDocument()
    expect(screen.getByText('답변 작성 중')).toBeInTheDocument()
    expect(screen.queryByText('답변 음성 생성 중')).not.toBeInTheDocument()

    setStreamingText('')
    setBusy(true)
    setGenerating(true)
    expect(screen.getByText('답변 작성 중')).toBeInTheDocument()
    expect(screen.getByText('답변 음성 생성 중')).toBeInTheDocument()
    view.unmount()
  })
})
