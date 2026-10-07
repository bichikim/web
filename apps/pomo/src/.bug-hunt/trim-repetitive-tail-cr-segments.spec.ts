/** @vitest-environment node */
import {expect, it} from 'vitest'

import {trimRepetitiveTail} from '../features/text-generation/answer'

it('should trim carriage-return-separated repeated phrases after three occurrences', () => {
  const phrase = 'same phrase here'
  const answer = Array.from({length: 5}, () => phrase).join('\r')

  expect(trimRepetitiveTail(answer)).toBe(Array.from({length: 3}, () => phrase).join('\r'))
})
