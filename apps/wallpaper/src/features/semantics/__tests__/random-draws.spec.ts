import {expect, test, vi} from 'vitest'
import {createRandomDraws} from '../random-draws'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
const binding: SemanticBinding = {
  action: {id: 'notes', kind: 'expression'},
  category: 'behavior',
  enabled: true,
  id: 'notes',
  mode: 'toggle',
  parameterId: null,
  text: '기록',
  threshold: 0.8,
}
test('should retain one draw through narration updates and draw anew only for a new or restarted narration', () => {
  const random = vi.fn(() => 0)
  const draws = createRandomDraws(random)
  const options = {
    bindings: [binding],
    input: {readoutId: 'first', text: '일반 문장', widgetId: 'widget'},
    scores: {},
    settings: {bindingIds: ['notes'], enabled: true, probability: 0.3},
  }
  expect(
    draws.select({...options, input: {...options.input, readoutId: undefined}}),
  ).toBeUndefined()
  expect(random).not.toHaveBeenCalled()
  expect(draws.select(options)).toBe('notes')
  expect(draws.select({...options, input: {...options.input, text: '뒤에 문장이 추가됨'}})).toBe(
    'notes',
  )
  expect(random).toHaveBeenCalledTimes(2)
  draws.clear('widget')
  expect(draws.select(options)).toBe('notes')
  expect(random).toHaveBeenCalledTimes(4)
  expect(
    draws.select({...options, input: {...options.input, readoutId: 'second'}, scores: {notes: 1}}),
  ).toBeUndefined()
  expect(random).toHaveBeenCalledTimes(4)
})
test('should retain a failed chance instead of retrying for each streamed paragraph', () => {
  const random = vi.fn(() => 0.9)
  const draws = createRandomDraws(random)
  const options = {
    bindings: [binding],
    input: {readoutId: 'first', text: '일반 문장', widgetId: 'widget'},
    scores: {},
    settings: {bindingIds: ['notes'], enabled: true, probability: 0.3},
  }
  expect(draws.select(options)).toBeUndefined()
  expect(draws.select(options)).toBeUndefined()
  expect(random).toHaveBeenCalledOnce()
})
