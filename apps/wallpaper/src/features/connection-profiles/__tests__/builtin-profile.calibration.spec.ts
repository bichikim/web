import {expect, test} from 'vitest'
import {builtinConnectionProfile} from '../builtin-profile'
import {selectSemanticActions} from '../../semantics/select-actions'
import measured from './matching-cases.json'

const profile = builtinConnectionProfile('builtin:ash')!
const bindings = profile.connections.semanticBindings!
const actions = bindings.map((binding) => ({action: binding.action!, label: binding.id}))
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
    expect(bindings).toHaveLength(28)
    expect(
      bindings.map(({id, text, excludeText, threshold}) => ({excludeText, id, text, threshold})),
    ).toEqual(measured.descriptions)
    for (const binding of bindings.filter((binding) => binding.category !== 'behavior')) {
      const positive = measured.cases.filter(
        (sample) =>
          sample.expected === binding.id &&
          (sample.purpose === 'calibration' || sample.purpose === 'paraphrase'),
      )
      const matches = positive.filter((sample) =>
        select(sample, backend).includes(binding.action!.id),
      )
      expect(matches.length, binding.id).toBeGreaterThanOrEqual(4)
    }
    for (const sample of measured.cases.filter((sample) => sample.purpose === 'negative')) {
      const binding = bindings.find((binding) => binding.id === sample.expected)!
      expect(select(sample, backend), sample.text).not.toContain(binding.action!.id)
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
