import {describe, expect, test} from 'vitest'

import {
  advanceEyeBlink,
  createEyeBlinkState,
  DEFAULT_EYE_BLINK_TIMING,
  resolveEyeBlinkTiming,
} from '../eye-blink'

describe('eye blink', () => {
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
})
