/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getPCoarticulatedVisemeAtTime, getPVisemeAtTime} from '../features/lip-sync'

const delayedCue = [{endMs: 100, startMs: 50, viseme: 'round' as const}]

it('should return rest before a viseme cue start time', () => {
  expect(getPVisemeAtTime(delayedCue, 10)).toBe('rest')
})

it('should not anticipate a viseme before its cue start time', () => {
  expect(getPCoarticulatedVisemeAtTime(delayedCue, 10)).toBe('rest')
})
