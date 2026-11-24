/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {createLocalInference} from '../../inference/create-local-inference'
import {useCharacterChat} from '../use-character-chat'
import {codexConversation} from '../codex'
import type {PoffoConversation} from '@winter-love/wallpaper/settings/conversation'

vi.mock('../../inference/create-local-inference', () => ({createLocalInference: vi.fn()}))
vi.mock('../codex', () => ({codexConversation: {reply: vi.fn()}}))
afterEach(() => vi.clearAllMocks())

it.each(['local', 'codex'] as const)(
  'should interrupt %s generation, clear the sent draft, and ignore its late answer',
  async (provider) => {
    const pending = Promise.withResolvers<string>()
    const reply = vi
      .fn<ReturnType<typeof createLocalInference>['run']>()
      .mockResolvedValueOnce('이전 답변')
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce('새 답변')
    vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run: reply})
    vi.mocked(codexConversation.reply).mockImplementation((messages, signal) =>
      reply({messages, type: 'chat'}, signal),
    )
    const owner = createRoot((dispose) => ({
      chat: useCharacterChat({conversation: () => ({provider}), widgetId: () => 'one'}),
      dispose,
    }))
    owner.chat.edit('이전 말')
    await owner.chat.send()
    owner.chat.edit('중단할 말')
    const abandoned = owner.chat.send()
    owner.chat.interrupt()
    expect(reply.mock.calls[1][1].aborted).toBe(true)
    expect(owner.chat.busy()).toBe(false)
    expect(owner.chat.draft()).toBe('')
    expect(owner.chat.message()).toBeNull()
    expect(owner.chat.response()).toBe('이전 답변')
    owner.chat.edit('새로운 말')
    await owner.chat.send()
    pending.resolve('중단 후 늦게 도착한 답변')
    await abandoned
    expect(owner.chat.response()).toBe('새 답변')
    expect(owner.chat.message()?.text).toBe('새 답변')
    expect(reply.mock.calls[2][0].messages).toEqual([
      {content: '이전 말', role: 'user'},
      {content: '이전 답변', role: 'assistant'},
      {content: '새로운 말', role: 'user'},
    ])
    owner.dispose()
  },
)

it('should keep generation running when settings repeat the same model selection', async () => {
  const pending = Promise.withResolvers<string>()
  const run = vi.fn<ReturnType<typeof createLocalInference>['run']>(() => pending.promise)
  const disposeModel = vi.fn()
  vi.mocked(createLocalInference).mockReturnValue({dispose: disposeModel, run})
  const [model, setModel] = createSignal<PoffoConversation>({provider: 'local'})
  const owner = createRoot((dispose) => ({
    chat: useCharacterChat({conversation: model, widgetId: () => 'one'}),
    dispose,
  }))
  owner.chat.edit('질문')
  const sending = owner.chat.send()
  setModel({provider: 'local'})
  expect(run.mock.calls[0][1].aborted).toBe(false)
  expect(disposeModel).not.toHaveBeenCalled()
  pending.resolve('계속 생성한 답변')
  await sending
  expect(owner.chat.response()).toBe('계속 생성한 답변')
  owner.dispose()
})

it('should use the selected Codex model with the existing dialogue and keep one response', async () => {
  const local = vi.fn().mockResolvedValue('로컬 답변')
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run: local})
  vi.mocked(codexConversation.reply).mockResolvedValue('Codex 답변')
  const [model, setModel] = createSignal<PoffoConversation>({provider: 'local'})
  const owner = createRoot((dispose) => ({
    chat: useCharacterChat({conversation: model, widgetId: () => 'one'}),
    dispose,
  }))
  owner.chat.edit('첫 질문')
  await owner.chat.send()
  setModel({codexModel: 'chosen-model', provider: 'codex'})
  owner.chat.edit('이어지는 질문')
  await owner.chat.send()
  expect(codexConversation.reply).toHaveBeenCalledExactlyOnceWith(
    [
      {content: '첫 질문', role: 'user'},
      {content: '로컬 답변', role: 'assistant'},
      {content: '이어지는 질문', role: 'user'},
    ],
    expect.any(AbortSignal),
    'chosen-model',
  )
  expect(owner.chat.response()).toBe('Codex 답변')
  expect(local).toHaveBeenCalledOnce()
  owner.dispose()
})

it('should cancel a pending reply when the selected model changes and retain the draft for retry', async () => {
  const pending = Promise.withResolvers<string>()
  const local = vi.fn<ReturnType<typeof createLocalInference>['run']>(() => pending.promise)
  const disposeModel = vi.fn()
  vi.mocked(createLocalInference).mockReturnValue({dispose: disposeModel, run: local})
  const [model, setModel] = createSignal<PoffoConversation>({provider: 'local'})
  const owner = createRoot((dispose) => ({
    chat: useCharacterChat({conversation: model, widgetId: () => 'one'}),
    dispose,
  }))
  owner.chat.edit('진행 중인 질문')
  const sending = owner.chat.send()
  setModel({provider: 'codex'})
  pending.resolve('이전 모델의 응답')
  await sending
  expect(local.mock.calls[0][1].aborted).toBe(true)
  expect(disposeModel).toHaveBeenCalledOnce()
  expect(owner.chat.response()).toBe('')
  expect(owner.chat.draft()).toBe('진행 중인 질문')
  expect(owner.chat.busy()).toBe(false)
  owner.dispose()
})

it('should replace one response and keep only character dialogue in its bounded context', async () => {
  const run = vi.fn().mockResolvedValueOnce('안녕!').mockResolvedValueOnce('같이 쉬자.')
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
  const owner = createRoot((dispose) => ({
    chat: useCharacterChat({widgetId: () => 'one'}),
    dispose,
  }))
  owner.chat.edit('안녕')
  await owner.chat.send()
  const first = owner.chat.message()
  owner.chat.edit('조금 피곤해')
  await owner.chat.send()
  expect(owner.chat.response()).toBe('같이 쉬자.')
  expect(owner.chat.message()?.id).not.toBe(first?.id)
  expect(run.mock.calls[1][0].messages).toEqual([
    {content: '안녕', role: 'user'},
    {content: '안녕!', role: 'assistant'},
    {content: '조금 피곤해', role: 'user'},
  ])
  owner.dispose()
})

it('should reject duplicate sends and retain the draft after inference failure', async () => {
  const pending = Promise.withResolvers<string>()
  const run = vi.fn<ReturnType<typeof createLocalInference>['run']>(() => pending.promise)
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
  const owner = createRoot((dispose) => ({
    chat: useCharacterChat({widgetId: () => 'one'}),
    dispose,
  }))
  owner.chat.edit('보낼 말')
  const sending = owner.chat.send()
  await owner.chat.send()
  expect(run).toHaveBeenCalledTimes(1)
  pending.reject(new Error('모델 오류'))
  await sending
  expect(owner.chat.error()).toBe('모델 오류')
  expect(owner.chat.draft()).toBe('보낼 말')
  expect(owner.chat.response()).toBe('')
  owner.dispose()
})

it('should discard stale answers when the widget changes and abort on disposal', async () => {
  const pending = Promise.withResolvers<string>()
  const run = vi.fn<ReturnType<typeof createLocalInference>['run']>(() => pending.promise)
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
  const [widget, setWidget] = createSignal('one')
  const owner = createRoot((dispose) => ({chat: useCharacterChat({widgetId: widget}), dispose}))
  owner.chat.edit('옛 요청')
  const sending = owner.chat.send()
  const signal = run.mock.calls[0][1]
  setWidget('two')
  pending.resolve('옛 응답')
  await sending
  expect(owner.chat.response()).toBe('')
  expect(signal.aborted).toBe(true)
  owner.dispose()
})

it('should retire the previous narration on recording and keep its text until the next answer arrives', async () => {
  const next = Promise.withResolvers<string>()
  const run = vi.fn().mockResolvedValueOnce('이전 답변').mockReturnValueOnce(next.promise)
  vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
  const [recording, setRecording] = createSignal(false)
  const owner = createRoot((dispose) => ({
    chat: useCharacterChat({recording, widgetId: () => 'one'}),
    dispose,
  }))
  owner.chat.edit('첫 번째 말')
  await owner.chat.send()
  const previous = owner.chat.message()
  setRecording(true)
  expect(owner.chat.message()).toBeNull()
  expect(owner.chat.response()).toBe('이전 답변')
  setRecording(false)
  expect(owner.chat.message()).toBeNull()
  owner.chat.edit('두 번째 말')
  const sending = owner.chat.send()
  expect(owner.chat.message()).toBeNull()
  expect(owner.chat.response()).toBe('이전 답변')
  next.resolve('새 답변')
  await sending
  expect(owner.chat.message()?.text).toBe('새 답변')
  expect(owner.chat.message()?.id).not.toBe(previous?.id)
  owner.dispose()
})

it.each(['failure', 'cancel'] as const)(
  'should keep old narration retired after %s',
  async (result) => {
    const next = Promise.withResolvers<string>()
    const run = vi.fn().mockResolvedValueOnce('이전 답변').mockReturnValueOnce(next.promise)
    vi.mocked(createLocalInference).mockReturnValue({dispose: vi.fn(), run})
    const owner = createRoot((dispose) => ({
      chat: useCharacterChat({widgetId: () => 'one'}),
      dispose,
    }))
    owner.chat.edit('첫 번째 말')
    await owner.chat.send()
    owner.chat.edit('두 번째 말')
    const sending = owner.chat.send()
    expect(owner.chat.message()).toBeNull()
    if (result === 'cancel') {
      owner.chat.cancel()
      next.resolve('취소된 답변')
    } else {
      next.reject(new Error('모델 오류'))
    }
    await sending
    expect(owner.chat.message()).toBeNull()
    expect(owner.chat.response()).toBe('이전 답변')
    owner.dispose()
  },
)
