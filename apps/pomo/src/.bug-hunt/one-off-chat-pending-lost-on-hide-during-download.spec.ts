/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type ChatController, type ChatState, useChat} from '../features/chat'
import {type ModelDownloadResult, useModelDownload} from '../features/model-download'
import {isTextModelDownloaded} from '../features/text-generation'
import {useAiTextJob} from '../features/ai-job/use-ai-text-job'
import {useOneOffChat} from '../components/p-studio/use-one-off-chat'

vi.mock('../features/chat', () => ({useChat: vi.fn()}))
vi.mock('../features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('../features/ai-job/use-ai-text-job', () => ({useAiTextJob: vi.fn()}))
vi.mock('../features/text-generation', () => ({
  getTextModel: () => ({downloadSize: '3.7GB', id: 'gemma-4-e2b', label: 'Gemma 4 E2B'}),
  isTextModelDownloaded: vi.fn(),
}))

const createChat = () => {
  const [draft, setDraft] = createSignal('')
  const [state, setState] = createSignal<ChatState>({status: 'idle'})
  const chat = {
    canClear: () => false,
    clear: vi.fn(),
    draft,
    isBusy: () => false,
    isModelReady: () => state().status === 'ready',
    messages: () => [],
    prepare: vi.fn(() => setState({percentage: 0, status: 'loading'})),
    send: vi.fn(() => setState({status: 'generating'})),
    setDraft: vi.fn(setDraft),
    state,
  } as unknown as ChatController & {setState: typeof setState}

  return {chat, setState}
}

const download = {
  startTextModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  state: () => ({status: 'idle'}) as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useModelDownload).mockReturnValue(download as never)
  vi.mocked(useAiTextJob).mockReturnValue({
    executionMode: () => 'local',
    isBusy: () => false,
    submit: vi.fn(async () => true),
  } as never)
})

describe('useOneOffChat pending download', () => {
  it('should still send after download when the composer was hidden during consent', async () => {
    const [isEnabled, setIsEnabled] = createSignal(true)
    const {chat, setState} = createChat()
    vi.mocked(useChat).mockReturnValue(chat)
    vi.mocked(isTextModelDownloaded).mockResolvedValue(false)

    const {cleanup, result} = renderHook(() => useOneOffChat({isEnabled, onReply: vi.fn()}))

    await result.submit('다운로드 전에 보낼 질문')
    expect(result.downloadConsentOpen()).toBe(true)

    setIsEnabled(false)
    await result.startDownload()
    setIsEnabled(true)
    setState({status: 'ready'})

    await vi.waitFor(() => expect(chat.send).toHaveBeenCalledOnce())
    cleanup()
  })
})
