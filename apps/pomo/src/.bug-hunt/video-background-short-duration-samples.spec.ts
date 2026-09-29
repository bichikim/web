/** @vitest-environment node */
import {expect, it} from 'vitest'

import {sampleTimes} from '../features/video-background/timeline'

it('should keep strictly increasing sample times for clips shorter than the end margin', () => {
  expect(sampleTimes(0.04)).toEqual([0, 0.04])
})

it('should span the full duration when the clip length equals the end margin', () => {
  expect(sampleTimes(0.05)).toEqual([0, 0.05])
})
