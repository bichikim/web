import {describe, expect, test} from 'vitest'

import {advancePendulum, createPendulumState} from '../physics'
import type {PuppetPendulum} from '../document'

const pendulum: PuppetPendulum = {
  damping: 1.2,
  gravity: 9.8,
  id: 'swing',
  inputParameterId: 'input',
  inputScale: 1,
  length: 1,
  outputParameterId: 'output',
  outputScale: 1,
}

const advanceFrames = (count: number, deltaTime: number) => {
  let state = createPendulumState()

  for (let frame = 0; frame < count; frame += 1) {
    state = advancePendulum({deltaTime, input: 30, pendulum, state})
  }

  return state
}

describe('advancePendulum', () => {
  test('should move toward the scaled input target', () => {
    const state = advancePendulum({
      deltaTime: 0.5,
      input: 30,
      pendulum,
      state: createPendulumState(),
    })

    expect(state.position).toBeGreaterThan(0)
    expect(state.position).toBeLessThan(30)
    expect(state.velocity).toBeGreaterThan(0)
  })

  test('should produce the same state across render frame rates', () => {
    const atSixtyFrames = advanceFrames(60, 1 / 60)
    const atThirtyFrames = advanceFrames(30, 1 / 30)

    expect(atThirtyFrames.position).toBeCloseTo(atSixtyFrames.position, 8)
    expect(atThirtyFrames.velocity).toBeCloseTo(atSixtyFrames.velocity, 8)
    expect(atThirtyFrames.accumulator).toBeCloseTo(atSixtyFrames.accumulator, 8)
  })

  test('should cap catch-up work for an excessively large elapsed time', () => {
    const state = advancePendulum({
      deltaTime: Number.MAX_VALUE,
      input: 30,
      pendulum,
      state: createPendulumState(),
    })

    expect(Number.isFinite(state.position)).toBe(true)
    expect(Number.isFinite(state.velocity)).toBe(true)
    expect(state.accumulator).toBeLessThan(1 / 120)
  })

  test('should keep non-finite solver calculations out of the returned state', () => {
    const state = advancePendulum({
      deltaTime: 1 / 120,
      input: 1,
      pendulum: {...pendulum, length: Number.MIN_VALUE},
      state: createPendulumState(),
    })

    expect(state).toEqual({accumulator: 0, position: 0, velocity: 0})
  })
})
