import {describe, expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {parseDocumentValue} from '../parse-document'
import {
  advanceEyeBlink,
  applyBreath,
  applyLipSync,
  createEyeBlinkState,
  createSeededRandom,
  DEFAULT_EYE_BLINK_TIMING,
  pickGroupMotion,
  resolveEyeBlinkTiming,
} from '../model-effects'

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [
    {duration: 1, group: 'tap', id: 'a', tracks: []},
    {duration: 1, group: 'tap', id: 'b', tracks: []},
    {duration: 1, id: 'c', tracks: []},
  ],
  parameterRoles: {lipSync: ['mouth']},
  parameters: [{defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
}

describe('model effects', () => {
  test('should repeat seeded random numbers within 0..1', () => {
    const first = createSeededRandom(7)
    const second = createSeededRandom(7)
    const values = Array.from({length: 100}, () => first())
    expect(values).toEqual(Array.from({length: 100}, () => second()))
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
    // The minimal standard generator's first output for seed 1.
    expect(createSeededRandom(1)()).toBeCloseTo(48_270 / 2_147_483_646, 12)
  })

  test('should blink through closing, closed and opening, then wait', () => {
    const random = () => 0.5
    const options = {random, timing: DEFAULT_EYE_BLINK_TIMING}
    let state = createEyeBlinkState(DEFAULT_EYE_BLINK_TIMING, random)
    // Half of twice the 4 s interval: the first blink starts after 4 s.
    expect(state).toMatchObject({next: 4, phase: 'open'})
    const openness: Array<number> = []
    for (const deltaTime of [4.01, 0.05, 0.06, 0.06, 0.075, 0.1]) {
      const next = advanceEyeBlink(state, deltaTime, options)
      state = next.state
      openness.push(next.openness)
    }
    expect(openness.map((value) => Number(value.toFixed(2)))).toEqual([1, 0.5, 0, 0, 0.5, 1])
    expect(state).toMatchObject({phase: 'open'})
  })

  test('should fill omitted blink timing from the defaults and refuse other values', () => {
    expect(resolveEyeBlinkTiming(undefined)).toEqual(DEFAULT_EYE_BLINK_TIMING)
    expect(resolveEyeBlinkTiming({closing: undefined, interval: 8})).toEqual({
      ...DEFAULT_EYE_BLINK_TIMING,
      interval: 8,
    })
    expect(resolveEyeBlinkTiming({closed: 0})).toBeUndefined()
    expect(resolveEyeBlinkTiming({opening: Number.NaN})).toBeUndefined()
    expect(resolveEyeBlinkTiming({interval: Number.POSITIVE_INFINITY})).toBeUndefined()
  })

  test('should wait about the set interval and take the set phase times', () => {
    const random = () => 0.5
    // Times that halve exactly, so phase ends land on frame boundaries.
    const timing = resolveEyeBlinkTiming({closed: 0.25, closing: 0.5, interval: 1, opening: 0.5})!
    let state = createEyeBlinkState(timing, random)
    expect(state).toMatchObject({next: 1, phase: 'open'})
    const openness: Array<number> = []
    for (const deltaTime of [1.125, 0.25, 0.25, 0.125, 0.125, 0.25, 0.25]) {
      const next = advanceEyeBlink(state, deltaTime, {random, timing})
      state = next.state
      openness.push(next.openness)
    }
    expect(openness.map((value) => Number(value.toFixed(2)))).toEqual([1, 0.5, 0, 0, 0, 0.5, 1])
  })

  test('should add the lip-sync level within the parameter range', () => {
    expect(applyLipSync(document, {mouth: 0.6}, 0.3).mouth).toBeCloseTo(0.9)
    expect(applyLipSync(document, {mouth: 0.9}, 0.3).mouth).toBe(1)
  })

  test('should add each breath wave with its weight, within the parameter range', () => {
    const breathing: PuppetDocument = {
      ...document,
      breath: [
        {offset: 0, parameterId: 'angle', peak: 10, period: 4, weight: 0.5},
        {offset: 0.5, parameterId: 'mouth', peak: 0.5, period: 2, weight: 1},
      ],
      parameters: [
        ...(document.parameters ?? []),
        {defaultValue: 0, id: 'angle', maximum: 30, minimum: -30, name: 'Angle'},
      ],
    }
    expect(parseDocumentValue(breathing).ok).toBe(true)
    // A quarter of the angle's period: its sine peaks; half the mouth's: only the offset is
    // left. The mouth starts from its default when absent.
    const quarter = applyBreath(breathing, {angle: 2}, 1)
    expect(quarter.angle).toBe(7)
    expect(quarter.mouth).toBeCloseTo(0.5, 12)
    // The mouth's peak would pass its maximum.
    const early = applyBreath(breathing, {angle: 2, mouth: 0.8}, 0.5)
    expect(early.angle).toBeCloseTo(2 + 5 * Math.SQRT1_2, 12)
    expect(early.mouth).toBe(1)
    expect(applyBreath(breathing, {angle: 2, mouth: 0}, 1.5).mouth).toBeCloseTo(0, 12)
    const invalid = (entry: Record<string, unknown>) =>
      parseDocumentValue({...breathing, breath: [{...breathing.breath![0], ...entry}]}).ok
    expect(invalid({period: 0})).toBe(false)
    expect(invalid({parameterId: 'missing'})).toBe(false)
    expect(invalid({weight: Number.NaN})).toBe(false)
    expect(
      parseDocumentValue({...breathing, breath: [breathing.breath![0], breathing.breath![0]]}).ok,
    ).toBe(false)
  })

  test('should pick a motion of the group', () => {
    expect(pickGroupMotion(document, 'tap', () => 0.99)?.id).toBe('b')
    expect(pickGroupMotion(document, 'tap', () => 0)?.id).toBe('a')
    expect(pickGroupMotion(document, 'none', () => 0)).toBeUndefined()
  })
})
