/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {sampleTimes} from '../timeline'
import {sampleBlend} from '@winter-love/wallpaper/frame-renderer/sample-blend'

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
  it('should preserve the blend range for clips no longer than the end margin', () => {
    for (const duration of [0.04, 0.05]) {
      const times = sampleTimes(duration)

      expect(times).toEqual([0, duration])
      expect(sampleBlend(times, duration / 2)).toEqual({first: 0, mix: 0.5, next: 1})
    }
  })
})
