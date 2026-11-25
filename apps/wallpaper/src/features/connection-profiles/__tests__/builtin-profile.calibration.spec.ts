import {expect, test} from 'vitest'
import {builtinConnectionProfile} from '../builtin-profile'
import {semanticExamples} from '@winter-love/wallpaper/settings/semantic-examples'
import {semanticTargets} from '@winter-love/wallpaper/settings/semantic-targets'
import {chooseRandomAction, selectSemanticActions} from '../../semantics/select-actions'
import {selectAgentActions} from '../../agent-state/select-actions'
import measured from './matching-cases.json'

const profile = builtinConnectionProfile('builtin:ash')!
const bindings = profile.connections.semanticBindings!
const actions = bindings.flatMap((binding) =>
  semanticTargets(binding).map((action) => ({action, label: binding.id})),
)
const select = (sample: (typeof measured.cases)[number], backend: 'fp32' | 'q4') => {
  const scores = Object.fromEntries(
    measured.bindingIds.map((id, index) => [id, sample[backend][index]!]),
  )
  return selectSemanticActions({actions, bindings, frame: {scores, widgetId: 'calibration'}}).map(
    (item) => item.action.action.id,
  )
}
test.each(['fp32', 'q4'] as const)(
  'should match builtin emotions on natural paraphrases and reject neutral input (%s)',
  (backend) => {
    expect(bindings).toHaveLength(29)
    expect(
      bindings
        .filter((binding) => binding.category !== 'menu')
        .map((binding) => ({
          examples: semanticExamples(binding),
          excludeText: binding.excludeText,
          id: binding.id,
          text: binding.text,
          threshold: binding.threshold,
        })),
    ).toEqual(
      measured.descriptions.filter(
        (item) => bindings.find((binding) => binding.id === item.id)?.category !== 'menu',
      ),
    )
    for (const binding of bindings.filter(
      (binding) => (binding.category ?? 'emotion') === 'emotion',
    )) {
      const positive = measured.cases.filter(
        (sample) =>
          sample.expected === binding.id &&
          (sample.purpose === 'calibration' || sample.purpose === 'paraphrase'),
      )
      const matches = positive.filter((sample) =>
        semanticTargets(binding).every((action) => select(sample, backend).includes(action.id)),
      )
      expect(matches.length, binding.id).toBeGreaterThanOrEqual(4)
    }
    for (const sample of measured.cases.filter((sample) => sample.purpose === 'negative')) {
      const binding = bindings.find((binding) => binding.id === sample.expected)!
      for (const action of semanticTargets(binding)) {
        expect(select(sample, backend), sample.text).not.toContain(action.id)
      }
    }
    for (const sample of measured.cases.filter((sample) => sample.purpose === 'english')) {
      const binding = bindings.find((binding) => binding.id === sample.expected)!
      for (const action of semanticTargets(binding)) {
        expect(select(sample, backend), sample.text).toContain(action.id)
      }
    }
    for (const sample of measured.cases.filter((sample) => sample.purpose === 'neutral')) {
      expect(select(sample, backend), sample.text).toEqual([])
    }
  },
)
test('should default to a 50 percent random chance and persist mutually exclusive groups', () => {
  expect(profile.connections.randomActions).toMatchObject({enabled: true, probability: 0.5})
  expect(bindings.every((binding) => binding.exclusiveGroup !== undefined)).toBe(true)
})

test('should keep glasses in the context menu without connecting them to tool use or random behavior', () => {
  expect(profile.connections.agentBindings?.tool?.actions).toEqual([])
  expect(
    selectAgentActions({
      actions,
      bindings: profile.connections.agentBindings!,
      signals: {tool: true, working: true},
    }).map((selection) => selection.action.action.id),
  ).not.toContain('안경')
  const candidates = bindings.filter(
    (binding) => binding.enabled && binding.category === 'behavior',
  )
  expect(candidates.some((binding) => binding.id === 'ash:glasses')).toBe(false)
  expect(bindings.find((binding) => binding.id === 'ash:glasses')?.category).toBe('menu')
  const fallbackId = chooseRandomAction({
    bindings,
    random: () => 0,
    scores: {},
    settings: profile.connections.randomActions,
  })
  expect(fallbackId).not.toBe('ash:glasses')
  expect(
    selectSemanticActions({
      actions,
      bindings: bindings.map((binding) =>
        binding.id === 'ash:glasses' ? {...binding, menuActive: true} : binding,
      ),
      frame: {scores: {}, widgetId: 'ash'},
    }).map((selection) => selection.action.action.id),
  ).toEqual(['안경'])
})
