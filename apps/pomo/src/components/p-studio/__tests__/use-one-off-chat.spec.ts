/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type ChatController,
  type ChatMessage,
  type ChatState,
  useChat,
} from '../../../features/chat'
import {useModelDownload} from '../../../features/model-download'
import {isTextModelDownloaded} from '../../../features/text-generation'
import {useOneOffChat} from '../use-one-off-chat'

vi.mock('../../../features/chat', () => ({useChat: vi.fn()}))
vi.mock('../../../features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('../../../features/text-generation', () => ({
  getTextModel: () => ({downloadSize: '3.7GB', id: 'gemma-4-e2b', label: 'Gemma 4 E2B'}),
  isTextModelDownloaded: vi.fn(),
}))

const createChat = () => {
  const [draft, setDraft] = createSignal('')
  const [messages, setMessages] = createSignal<ReadonlyArray<ChatMessage>>([])
  const [state, setState] = createSignal<ChatState>({status: 'idle'})
  const updateDraft = vi.fn(setDraft)
  const chat = {
    canClear: () =>
      messages().length > 0 &&
      !['compacting', 'generating', 'loading', 'refining'].includes(state().status),
    clear: vi.fn(() => setMessages([])),
    draft,
    isBusy: () => ['compacting', 'generating', 'loading', 'refining'].includes(state().status),
    isModelReady: () => state().status === 'ready',
    messages,
    prepare: vi.fn(() => setState({percentage: 0, status: 'loading'})),
    send: vi.fn(() => setState({status: 'generating'})),
    setDraft: updateDraft,
    state,
  } as unknown as ChatController

  return {chat, setMessages, setState}
}

const download = {
  startTextModel: vi.fn(async () => ({status: 'complete'}) as const),
  state: () => ({status: 'idle'}) as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useModelDownload).mockReturnValue(download as never)
})

describe('useOneOffChat', () => {
  it('should prepare a downloaded model and send one trimmed question', async () => {
    const {chat, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    await result.submit('  오늘은 어떻게 집중할까?  ')

    expect(chat.prepare).toHaveBeenCalledOnce()
    expect(chat.send).not.toHaveBeenCalled()

    setState({status: 'ready'})

    expect(chat.setDraft).toHaveBeenCalledWith('오늘은 어떻게 집중할까?')
    expect(chat.send).toHaveBeenCalledWith({refineAnswer: true})
    cleanup()
  })

  it('should request consent before downloading a missing model', async () => {
    const {chat, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    await result.submit('새 대화')

    expect(result.downloadConsentOpen()).toBe(true)
    expect(chat.prepare).not.toHaveBeenCalled()

    await result.startDownload()
    expect(download.startTextModel).toHaveBeenCalledWith('gemma-4-e2b')
    expect(chat.prepare).toHaveBeenCalledOnce()

    setState({status: 'ready'})
    expect(chat.send).toHaveBeenCalledOnce()
    cleanup()
  })

  it('should speak the final reply and clear its in-memory conversation', async () => {
    const onReply = vi.fn(async () => undefined)
    const {chat, setMessages, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply}))

    await result.submit('짧게 인사해 줘')
    setState({status: 'ready'})
    const reply = {content: '반가워요.', id: 'reply-1', role: 'assistant'} as const
    setMessages([{content: '짧게 인사해 줘', id: 'user-1', role: 'user'}, reply])

    await vi.waitFor(() => expect(onReply).toHaveBeenCalledWith('반가워요.'))
    await vi.waitFor(() => expect(chat.clear).toHaveBeenCalledOnce())
    expect(chat.messages()).toEqual([])
    cleanup()
  })

  it('should reject unsupported submissions without entering a permanent busy state', async () => {
    const {chat, setState} = createChat()
    setState({status: 'unsupported'})
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    const submission = await result.submit('보낼 수 없는 대화')

    expect(submission).toBe(false)
    expect(result.isBusy()).toBe(false)
    expect(chat.prepare).not.toHaveBeenCalled()
    expect(chat.send).not.toHaveBeenCalled()
    cleanup()
  })
})
