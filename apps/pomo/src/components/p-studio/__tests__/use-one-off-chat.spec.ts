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
import {type ModelDownloadResult, useModelDownload} from '../../../features/model-download'
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
    clear: vi.fn(() => {
      if (chat.canClear()) {
        setMessages([])
      }
    }),
    draft,
    isBusy: () => ['compacting', 'generating', 'loading', 'refining'].includes(state().status),
    isModelReady: () => state().status === 'ready',
    messages,
    prepare: vi.fn(() => setState({percentage: 0, status: 'loading'})),
    send: vi.fn(() => {
      setDraft('')
      setState({status: 'generating'})
    }),
    setDraft: updateDraft,
    state,
  } as unknown as ChatController

  return {chat, setMessages, setState}
}

const download = {
  startTextModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
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
    await vi.waitFor(() => expect(chat.send).toHaveBeenCalledOnce())
    const reply = {content: '반가워요.', id: 'reply-1', role: 'assistant'} as const
    setMessages([{content: '짧게 인사해 줘', id: 'user-1', role: 'user'}, reply])
    setState({status: 'ready'})

    await vi.waitFor(() => expect(onReply).toHaveBeenCalledWith('반가워요.'))
    await vi.waitFor(() => expect(chat.clear).toHaveBeenCalledOnce())
    expect(chat.messages()).toEqual([])
    cleanup()
  })

  it('should expose a speech failure after clearing a completed reply', async () => {
    const onReply = vi.fn().mockRejectedValue(new Error('TTS failed'))
    const {chat, setMessages, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply}))

    await result.submit('짧게 인사해 줘')
    setState({status: 'ready'})
    await vi.waitFor(() => expect(chat.send).toHaveBeenCalledOnce())
    const reply = {content: '반가워요.', id: 'reply-1', role: 'assistant'} as const
    setMessages([{content: '짧게 인사해 줘', id: 'user-1', role: 'user'}, reply])
    setState({status: 'ready'})

    await vi.waitFor(() => expect(onReply).toHaveBeenCalledWith('반가워요.'))
    await vi.waitFor(() => expect(result.errorMessage()).toBe('TTS failed'))
    expect(chat.messages()).toEqual([])
    cleanup()
  })

  it('should ignore a stale speech failure after a new question is submitted', async () => {
    let rejectFirstReply: (error: unknown) => void = () => undefined
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const firstSpeech = new Promise<void>((_, reject) => {
      rejectFirstReply = reject
    })
    const onReply = vi
      .fn<(text: string) => Promise<void>>()
      .mockReturnValueOnce(firstSpeech)
      .mockResolvedValueOnce(undefined)
    const {chat, setMessages, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply}))

    await result.submit('첫 질문')
    setState({status: 'ready'})
    await vi.waitFor(() => expect(chat.send).toHaveBeenCalledOnce())
    setMessages([{content: '첫 답변', id: 'reply-1', role: 'assistant'}])
    setState({status: 'ready'})
    await vi.waitFor(() => expect(onReply).toHaveBeenCalledWith('첫 답변'))

    await result.submit('두 번째 질문')
    await vi.waitFor(() => expect(chat.send).toHaveBeenCalledTimes(2))
    setMessages([{content: '두 번째 답변', id: 'reply-2', role: 'assistant'}])
    setState({status: 'ready'})
    await vi.waitFor(() => expect(onReply).toHaveBeenCalledWith('두 번째 답변'))

    rejectFirstReply(new Error('stale TTS failed'))
    await firstSpeech.catch(() => undefined)
    expect(result.errorMessage()).toBeNull()
    expect(report).toHaveBeenCalledWith(
      'Failed to speak the one-off chat reply.',
      expect.any(Error),
    )
    report.mockRestore()
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

  it('should restore a failed preparation question and allow it to be retried', async () => {
    const {chat, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    await result.submit('첫 질문')
    setState({message: '모델 준비 실패', modelReady: false, status: 'error'})

    expect(result.errorMessage()).toBe('모델 준비 실패')
    expect(chat.draft()).toBe('첫 질문')
    expect(result.isBusy()).toBe(false)

    const retry = await result.submit('다시 시도')

    expect(retry).toBe(false)
    expect(chat.prepare).toHaveBeenCalledTimes(2)
    expect(result.errorMessage()).toBeNull()

    setState({status: 'ready'})

    expect(chat.setDraft).toHaveBeenLastCalledWith('다시 시도')
    expect(chat.send).toHaveBeenCalledOnce()
    cleanup()
  })

  it('should preserve a newer draft while sending a pending question', async () => {
    const {chat, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    await result.submit('첫 질문')
    result.setDraft('다음 질문')
    setState({status: 'ready'})

    expect(chat.send).toHaveBeenCalledOnce()
    expect(chat.draft()).toBe('다음 질문')
    cleanup()
  })

  it('should preserve a same-valued draft while sending a pending question', async () => {
    const {chat, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    result.setDraft('첫 질문')
    await result.submit('첫 질문')
    result.setDraft('첫 질문')
    setState({status: 'ready'})

    expect(chat.send).toHaveBeenCalledOnce()
    expect(result.draft()).toBe('첫 질문')
    cleanup()
  })

  it('should preserve a newer draft when preparation fails', async () => {
    const {chat, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    await result.submit('첫 질문')
    result.setDraft('다음 질문')
    setState({message: '모델 준비 실패', modelReady: false, status: 'error'})

    expect(result.errorMessage()).toBe('모델 준비 실패')
    expect(chat.draft()).toBe('다음 질문')
    cleanup()
  })

  it('should preserve an intentionally cleared draft when preparation fails', async () => {
    const {chat, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    result.setDraft('첫 질문')
    await result.submit('첫 질문')
    result.setDraft('')
    setState({message: '모델 준비 실패', modelReady: false, status: 'error'})

    expect(result.errorMessage()).toBe('모델 준비 실패')
    expect(result.draft()).toBe('')
    cleanup()
  })

  it('should keep the draft when download consent is cancelled', async () => {
    const {chat} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    result.setDraft('다운로드 전에 남길 질문')
    const accepted = await result.submit('다운로드 전에 남길 질문')

    expect(accepted).toBe(false)
    expect(result.draft()).toBe('다운로드 전에 남길 질문')
    result.cancelDownloadConsent()

    expect(result.draft()).toBe('다운로드 전에 남길 질문')
    expect(result.isBusy()).toBe(false)
    cleanup()
  })

  it('should keep the draft and expose a download failure', async () => {
    const {chat} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
    vi.mocked(download.startTextModel).mockResolvedValue({
      message: '모델 다운로드 실패',
      status: 'error',
    })
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    result.setDraft('다운로드 실패에도 남길 질문')
    await result.submit('다운로드 실패에도 남길 질문')
    await result.startDownload()

    expect(result.draft()).toBe('다운로드 실패에도 남길 질문')
    expect(result.errorMessage()).toBe('모델 다운로드 실패')
    expect(result.isBusy()).toBe(false)
    cleanup()
  })

  it('should expose a generation failure after the pending question was sent', async () => {
    const {chat, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
    const {cleanup, result} = renderHook(() => useOneOffChat({onReply: vi.fn()}))

    await result.submit('답변해 줘')
    setState({status: 'ready'})
    setState({message: '답변 생성 실패', modelReady: true, status: 'error'})

    expect(result.errorMessage()).toBe('답변 생성 실패')
    expect(result.isBusy()).toBe(false)
    cleanup()
  })
})
