/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseInteger} from '../features/supertonic/number-speech/parse-integer'

it('should parse fullwidth plus signed integers', () => {
  expect(parseInteger('＋5')).toBe(5n)
})
