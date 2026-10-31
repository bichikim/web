import {expect, it, vi} from 'vitest'
import {classifySemantics} from '../classify'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
const binding: SemanticBinding = {
  enabled: true,
  id: 'happy',
  mode: 'toggle',
  parameterId: 'smile',
  text: '기쁨',
  threshold: 0.75,
}
it('should embed text and active user descriptions with the same classification task', async () => {
  const embed = vi.fn().mockResolvedValue([
    [1, 0],
    [0.8, 0.6],
  ])
  expect(
    await classifySemantics({
      bindings: [binding, {...binding, enabled: false, id: 'off'}],
      embed,
      text: '해결했어!',
    }),
  ).toEqual({happy: 0.8})
  expect(embed).toHaveBeenCalledExactlyOnceWith([
    'task: classification | query: 해결했어!',
    'task: classification | query: 기쁨',
  ])
})
it('should avoid loading the model for empty text or incomplete connections', async () => {
  const embed = vi.fn()
  expect(await classifySemantics({bindings: [binding], embed, text: ''})).toEqual({})
  expect(
    await classifySemantics({bindings: [{...binding, parameterId: null}], embed, text: '안녕'}),
  ).toEqual({})
  expect(embed).not.toHaveBeenCalled()
})
it('should match conversational examples separately so a long answer does not dilute an action', async () => {
  const vectors: Readonly<Record<string, readonly number[]>> = {
    'task: classification | query: 문서에 기록했어요.': [1, 0],
    'task: classification | query: 요약해 두었어요.': [0.8, 0.6],
    'task: classification | query: 정리해서 작성했어요.': [1, 0],
    'task: classification | query: 확인 결과입니다.': [0, 1],
  }
  const embed = vi.fn(async (texts: readonly string[]) => texts.map((text) => vectors[text]))
  expect(
    await classifySemantics({
      bindings: [{...binding, text: '문서에 기록했어요.\n요약해 두었어요.'}],
      embed,
      text: '확인 결과입니다.\n\n정리해서 작성했어요.',
    }),
  ).toEqual({happy: 1})
  expect(embed).toHaveBeenCalledExactlyOnceWith([
    'task: classification | query: 확인 결과입니다.',
    'task: classification | query: 정리해서 작성했어요.',
    'task: classification | query: 문서에 기록했어요.',
    'task: classification | query: 요약해 두었어요.',
  ])
})
it('should reject invalid model output instead of publishing a fabricated match', async () => {
  const embed = vi.fn().mockResolvedValue([
    [1, 0],
    [Number.NaN, 0],
  ])
  await expect(classifySemantics({bindings: [binding], embed, text: '안녕'})).rejects.toThrow(
    'invalid embeddings',
  )
})
