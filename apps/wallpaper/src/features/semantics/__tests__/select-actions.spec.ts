import {expect, test, vi} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {chooseRandomAction, selectSemanticActions} from '../select-actions'
const bindings: readonly SemanticBinding[] = [
  {
    action: {id: 'smile', kind: 'expression'},
    category: 'emotion',
    enabled: true,
    id: 'happy',
    mode: 'toggle',
    parameterId: null,
    text: '행복',
    threshold: 0.8,
  },
  {
    action: {id: 'notes', kind: 'expression'},
    category: 'behavior',
    enabled: true,
    id: 'notes',
    mode: 'toggle',
    parameterId: null,
    text: '기록',
    threshold: 0.8,
  },
]
test('should draw only a behavior for unmatched narration and honor disabled and zero probability settings', () => {
  const random = vi.fn(() => 0)
  const settings = {bindingIds: ['happy', 'notes'], enabled: true, probability: 1}
  expect(chooseRandomAction({bindings, random, scores: {}, settings})).toBe('notes')
  expect(chooseRandomAction({bindings, random, scores: {happy: 0.9}, settings})).toBeUndefined()
  expect(
    chooseRandomAction({bindings, random, scores: {}, settings: {...settings, probability: 0}}),
  ).toBeUndefined()
  expect(
    chooseRandomAction({bindings, random, scores: {}, settings: {...settings, enabled: false}}),
  ).toBeUndefined()
  expect(
    chooseRandomAction({
      bindings,
      random,
      scores: {},
      settings: {...settings, bindingIds: ['happy']},
    }),
  ).toBeUndefined()
  expect(
    chooseRandomAction({
      bindings,
      random: () => 0.3,
      scores: {},
      settings: {...settings, probability: 0.3},
    }),
  ).toBeUndefined()
})
test('should prioritize manual and semantic actions over fallback and reject emotions from fallback frames', () => {
  const actions = bindings.map((binding) => ({action: binding.action!, label: binding.id}))
  expect(
    selectSemanticActions({
      actions,
      bindings,
      frame: {fallbackId: 'notes', scores: {}, widgetId: 'w'},
    }).map((item) => item.action.action.id),
  ).toEqual(['notes'])
  expect(
    selectSemanticActions({
      actions,
      bindings,
      frame: {fallbackId: 'happy', scores: {}, widgetId: 'w'},
    }),
  ).toEqual([])
  expect(
    selectSemanticActions({
      actions,
      bindings,
      frame: {fallbackId: 'notes', scores: {happy: 1}, widgetId: 'w'},
    })[0]?.action.action.id,
  ).toBe('smile')
  expect(
    selectSemanticActions({
      actions,
      bindings,
      frame: {fallbackId: 'notes', previewId: 'notes', scores: {happy: 1}, widgetId: 'w'},
    })[0]?.action.action.id,
  ).toBe('notes')
})
