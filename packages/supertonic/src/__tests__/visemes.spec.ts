/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  createVisemeTrack,
  getCoarticulatedVisemeAtTime,
  getVisemeAtTime,
} from '@winter-love/supertonic/visemes'

describe('createVisemeTrack', () => {
  it('should map Korean vowels and bilabial consonants to visible mouth shapes', () => {
    const cues = createVisemeTrack({durationMs: 1_000, text: '마보이'})

    expect(cues.map((cue) => cue.viseme)).toEqual(['closed', 'open', 'closed', 'round', 'wide'])
    expect(cues[0]?.startMs).toBe(0)
    expect(cues.at(-1)?.endMs).toBe(1_000)
  })

  it('should map the Korean tense bilabial onset to a closed mouth shape', () => {
    const cues = createVisemeTrack({durationMs: 1_000, text: '빠'})

    expect(cues.map((cue) => cue.viseme)).toEqual(['closed', 'open'])
  })

  it('should preserve pauses and fit every cue to the rendered duration', () => {
    const cues = createVisemeTrack({durationMs: 600, text: '아, 오.'})

    expect(cues.map((cue) => cue.viseme)).toEqual(['open', 'rest', 'round', 'rest'])
    expect(cues.at(-1)?.endMs).toBe(600)
  })

  it('should allocate cue durations in proportion to their pronunciation weights', () => {
    const cues = createVisemeTrack({durationMs: 2_300, text: '아,오'})

    expect(cues.map((cue) => cue.viseme)).toEqual(['open', 'rest', 'round'])
    expect(cues[0]?.startMs).toBe(0)
    expect(cues[0]?.endMs).toBeCloseTo(1_000)
    expect(cues[1]?.startMs).toBe(cues[0]?.endMs)
    expect(cues[1]?.endMs).toBeCloseTo(1_300)
    expect(cues[2]?.startMs).toBe(cues[1]?.endMs)
    expect(cues[2]?.endMs).toBe(2_300)
  })

  it('should return an empty track for zero duration', () => {
    expect(createVisemeTrack({durationMs: 0, text: '안녕'})).toEqual([])
  })

  it('should keep an empty utterance at rest', () => {
    expect(createVisemeTrack({durationMs: 300, text: ''})).toEqual([
      {endMs: 300, startMs: 0, viseme: 'rest'},
    ])
  })

  it('should map Latin shapes and a bilabial Hangul final', () => {
    const cues = createVisemeTrack({durationMs: 1_000, text: 'AeiouBmx암'})

    expect(cues.map((cue) => cue.viseme)).toEqual([
      'open',
      'wide',
      'round',
      'closed',
      'narrow',
      'open',
    ])
  })

  it('should merge mouth cues that are too short to display', () => {
    const cues = createVisemeTrack({durationMs: 100, text: 'aeo'})

    expect(cues).toEqual([{endMs: 100, startMs: 0, viseme: 'open'}])
  })
})

describe('getVisemeAtTime', () => {
  const cues = createVisemeTrack({durationMs: 300, text: '아오'})

  it('should resolve a cue from the current audio-clock position', () => {
    expect(getVisemeAtTime(cues, 0)).toBe('open')
    expect(getVisemeAtTime(cues, 200)).toBe('round')
  })

  it('should return rest outside the track', () => {
    expect(getVisemeAtTime(cues, -1)).toBe('rest')
    expect(getVisemeAtTime(cues, 300)).toBe('rest')
  })
})

describe('getCoarticulatedVisemeAtTime', () => {
  const cues = [
    {endMs: 100, startMs: 0, viseme: 'open'},
    {endMs: 200, startMs: 100, viseme: 'round'},
  ] as const

  it('should expose the next mouth shape fifty milliseconds before its cue boundary', () => {
    expect(getCoarticulatedVisemeAtTime(cues, 49)).toBe('open')
    expect(getCoarticulatedVisemeAtTime(cues, 50)).toBe('round')
    expect(getCoarticulatedVisemeAtTime(cues, 150)).toBe('rest')
  })

  it('should remain at rest before playback starts', () => {
    expect(getCoarticulatedVisemeAtTime(cues, -1)).toBe('rest')
  })
})
