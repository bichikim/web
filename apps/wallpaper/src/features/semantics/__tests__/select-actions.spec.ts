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
  const settings = {enabled: true, probability: 1}
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
      bindings: [bindings[0]],
      random,
      scores: {},
      settings,
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

test('should retain only winning next-narration actions at voice end, including random actions', () => {
  const held = {
    ...bindings[1],
    category: 'emotion' as const,
    exclusiveGroup: 'hands',
    release: 'next-speech' as const,
  }
  const transient = {...bindings[0], exclusiveGroup: 'face'}
  const actions = [held, transient].map((binding) => ({action: binding.action!, label: binding.id}))
  const ended = {narration: {phase: 'ended' as const}, scores: {happy: 1, notes: 1}, widgetId: 'w'}
  expect(
    selectSemanticActions({actions, bindings: [held, transient], frame: ended}).map(
      (item) => item.group,
    ),
  ).toEqual(['hands'])
  expect(
    selectSemanticActions({
      actions,
      bindings: [{...held, category: 'behavior'}, transient],
      frame: {...ended, fallbackId: 'notes', scores: {}},
    }).map((item) => item.group),
  ).toEqual(['hands'])
  expect(
    selectSemanticActions({
      actions,
      bindings: [{...held, exclusiveGroup: 'face'}, transient],
      frame: {...ended, scores: {happy: 1, notes: 0.9}},
    }),
  ).toEqual([])
  expect(
    selectSemanticActions({
      actions,
      bindings: [held, transient],
      frame: {...ended, previewId: 'happy'},
    })[0]?.action.action.id,
  ).toBe('smile')
})

test('should gate behavior on one 50 percent draw when no emotion matches, regardless of behavior scores', () => {
  const walk = {...bindings[1], action: {id: 'walk', kind: 'motion' as const}, id: 'walk'}
  const all = [...bindings, walk]
  const actions = all.map((binding) => ({action: binding.action!, label: binding.id}))
  const settings = {enabled: true, probability: 0.5}
  const random = vi.fn().mockReturnValueOnce(0.5)
  const scores = {notes: 1}
  expect(chooseRandomAction({bindings: all, random, scores, settings})).toBeUndefined()
  expect(random).toHaveBeenCalledOnce()
  expect(selectSemanticActions({actions, bindings: all, frame: {scores, widgetId: 'w'}})).toEqual(
    [],
  )
  random.mockReset().mockReturnValueOnce(0.49).mockReturnValueOnce(0.99)
  const fallbackId = chooseRandomAction({bindings: all, random, scores, settings})
  expect(fallbackId).toBe('walk')
  expect(
    selectSemanticActions({actions, bindings: all, frame: {fallbackId, scores, widgetId: 'w'}}).map(
      (item) => item.action.action.id,
    ),
  ).toEqual(['walk'])
  random.mockClear()
  expect(
    chooseRandomAction({bindings: all, random, scores: {...scores, happy: 1}, settings}),
  ).toBeUndefined()
  expect(random).not.toHaveBeenCalled()
  expect(
    selectSemanticActions({
      actions,
      bindings: all,
      frame: {fallbackId: 'walk', scores: {...scores, happy: 1}, widgetId: 'w'},
    }).map((item) => item.action.action.id),
  ).toEqual(['smile'])
})
