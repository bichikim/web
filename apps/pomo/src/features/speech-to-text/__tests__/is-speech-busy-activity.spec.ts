import {expect, it} from 'vitest'

import {isSpeechBusyActivity} from '../is-speech-busy-activity'
import type {SpeechActivity} from '../use-speech-to-text'

it.each([
  ['checking', true],
  ['processing', true],
  ['requesting', true],
  ['idle', false],
  ['recording', false],
] satisfies Array<[SpeechActivity, boolean]>)(
  'should classify %s as busy: %s',
  (activity, expected) => {
    expect(isSpeechBusyActivity(activity)).toBe(expected)
  },
)
