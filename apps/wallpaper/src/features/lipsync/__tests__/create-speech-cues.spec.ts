import {expect, it} from 'vitest'
import {createSpeechCues} from '../create-speech-cues'

it('should keep bilabial closure short enough to show the following vowel', () => {
  const cues = createSpeechCues('마오', 2.25)
  expect(cues).toEqual([
    {end: 0.25, shape: 'closed'},
    {end: 1.25, shape: 'a'},
    {end: 2.25, shape: 'o'},
  ])
})
it('should give word spaces less time than vowels and preserve punctuation pauses', () => {
  const cues = createSpeechCues('아 오.', 2.65)
  expect(cues.map((cue) => cue.shape)).toEqual(['a', null, 'o', null])
  expect(cues[0]!.end).toBeCloseTo(1)
  expect(cues[1]!.end).toBeCloseTo(1.1)
  expect(cues[2]!.end).toBeCloseTo(2.1)
  expect(cues[3]!.end).toBe(2.65)
})
it('should leave empty text and invalid durations without cues', () => {
  expect(createSpeechCues('', 1)).toEqual([])
  expect(createSpeechCues('아', 0)).toEqual([])
  expect(createSpeechCues('아', Number.NaN)).toEqual([])
})
