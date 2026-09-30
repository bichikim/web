/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseRetryAfterSeconds} from '../features/http-client/parse-retry-after-seconds'

it('should reject Retry-After second counts that are not safe integers', () => {
  expect(parseRetryAfterSeconds('9007199254740993')).toBeNull()
})

it('should reject Retry-After values that overflow JavaScript integer precision', () => {
  expect(parseRetryAfterSeconds('999999999999999999999')).toBeNull()
})
