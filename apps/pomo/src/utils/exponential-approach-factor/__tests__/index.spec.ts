/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {exponentialApproachFactor} from '..'

describe('exponentialApproachFactor', () => {
  it('should retain a positive approach step for extremely small elapsed time', () => {
    const elapsed = 1e-20
    expect(exponentialApproachFactor(elapsed, 1)).toBe(elapsed)
  })

  it('should remain still at zero elapsed time', () => {
    expect(exponentialApproachFactor(0, 100)).toBe(0)
  })

  it('should advance about 63 percent in one time constant', () => {
    expect(exponentialApproachFactor(100, 100)).toBeCloseTo(0.6321205588285577, 15)
  })

  it('should approach a fixed target equally across one full step or two half steps', () => {
    const halfStep = exponentialApproachFactor(16, 100)
    const combined = halfStep + (1 - halfStep) * halfStep
    expect(combined).toBeCloseTo(exponentialApproachFactor(32, 100), 15)
  })
})
