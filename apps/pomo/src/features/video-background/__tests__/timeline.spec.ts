import {describe, expect, it} from 'vitest'
import {sampleBlend, sampleTimes} from '../timeline'

describe('video background timeline', () => {
  it('should bound analysis and include both ends of a long video', () => {
    const times = sampleTimes(3600)
    expect(times).toHaveLength(24)
    expect(times[0]).toBe(0)
    expect(times.at(-1)).toBeCloseTo(3599.95)
  })
  it('should handle short and unknown durations', () => {
    expect(sampleTimes(Infinity)).toEqual([0])
    expect(sampleTimes(0)).toEqual([0])
    expect(sampleTimes(1)).toEqual([0, 0.95])
  })
  it('should interpolate using actual timestamps and clamp outside the timeline', () => {
    expect(sampleBlend([0, 5, 10], 7.5)).toEqual({first: 1, mix: 0.5, next: 2})
    expect(sampleBlend([0, 5, 10], -1)).toEqual({first: 0, mix: 0, next: 1})
    expect(sampleBlend([0, 5, 10], 20)).toEqual({first: 2, mix: 0, next: 2})
    expect(sampleBlend([0], 2)).toEqual({first: 0, mix: 0, next: 0})
  })
})
