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
it('should reject invalid model output instead of publishing a fabricated match', async () => {
  const embed = vi.fn().mockResolvedValue([
    [1, 0],
    [Number.NaN, 0],
  ])
  await expect(classifySemantics({bindings: [binding], embed, text: '안녕'})).rejects.toThrow(
    'invalid embeddings',
  )
})
