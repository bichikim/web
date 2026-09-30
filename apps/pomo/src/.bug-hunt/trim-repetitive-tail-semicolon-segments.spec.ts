/** @vitest-environment node */
import {expect, it} from 'vitest'

import {trimRepetitiveTail} from '../features/text-generation/answer'

it('should trim semicolon-separated repeated phrases like period-separated sentences', () => {
  const answer =
    'same phrase here; same phrase here; same phrase here; same phrase here; same phrase here;'

  expect(trimRepetitiveTail(answer)).toBe(
    'same phrase here; same phrase here; same phrase here.',
  )
})
