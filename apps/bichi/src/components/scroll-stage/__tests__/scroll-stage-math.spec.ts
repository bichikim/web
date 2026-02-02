import {describe, expect, it} from 'vitest'

import {clamp, lerp} from '../scroll-stage-math'

describe('scroll-stage-math', () => {
  it('clamps values within bounds', () => {
    expect(clamp(0, 10, -5)).toBe(0)
    expect(clamp(0, 10, 5)).toBe(5)
    expect(clamp(0, 10, 15)).toBe(10)
  })

  it('lerps between current and target', () => {
    expect(lerp(0, 10, 0.5)).toBe(5)
    expect(lerp(10, 10, 0.5)).toBe(10)
  })
})
