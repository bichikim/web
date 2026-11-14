import {expect, it} from 'vitest'
import {sampleBlend} from '../sample-blend'

it('should interpolate using actual timestamps and clamp outside the timeline', () => {
  expect(sampleBlend([0, 5, 10], 7.5)).toEqual({first: 1, mix: 0.5, next: 2})
  expect(sampleBlend([0, 5, 10], -1)).toEqual({first: 0, mix: 0, next: 1})
  expect(sampleBlend([0, 5, 10], 20)).toEqual({first: 2, mix: 0, next: 2})
  expect(sampleBlend([0], 2)).toEqual({first: 0, mix: 0, next: 0})
})
