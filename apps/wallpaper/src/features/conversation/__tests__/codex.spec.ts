/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {codexConversation} from '../codex'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => vi.resetAllMocks())

it('should use the chosen model and cancel the native request when aborted', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  const answer = Promise.withResolvers<string>()
  vi.mocked(invoke).mockReturnValueOnce(answer.promise).mockResolvedValue(undefined)
  const abort = new AbortController()
  const messages = [{content: '안녕', role: 'user' as const}]
  const generating = codexConversation.reply(messages, abort.signal, 'chosen-model')
  expect(invoke).toHaveBeenCalledWith('generate_codex_conversation', {
    request: {
      id: expect.any(String),
      messages,
      model: 'chosen-model',
    },
  })
  const request = vi.mocked(invoke).mock.calls[0][1] as {request: {id: string}}
  abort.abort()
  expect(invoke).toHaveBeenCalledWith('cancel_codex_conversation', {id: request.request.id})
  answer.resolve('이전 답변')
  await expect(generating).rejects.toMatchObject({name: 'AbortError'})
})

it('should expose account errors and never substitute another model', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockRejectedValue('modelUnavailable')
  await expect(
    codexConversation.reply(
      [{content: '안녕', role: 'user'}],
      new AbortController().signal,
      'missing',
    ),
  ).rejects.toThrow('선택한 Codex 모델을 사용할 수 없어요.')
  expect(invoke).toHaveBeenCalledOnce()
  vi.mocked(invoke).mockRejectedValue('loginRequired')
  await expect(codexConversation.models()).rejects.toThrow('Codex에 먼저 로그인해 주세요.')
})

it('should avoid native requests in the browser or after cancellation', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  expect(await codexConversation.models()).toEqual([])
  await expect(
    codexConversation.reply([{content: '안녕', role: 'user'}], new AbortController().signal),
  ).rejects.toThrow('데스크톱')
  const abort = new AbortController()
  abort.abort()
  await expect(codexConversation.reply([], abort.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  expect(invoke).not.toHaveBeenCalled()
})
