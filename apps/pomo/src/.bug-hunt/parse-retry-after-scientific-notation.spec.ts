/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseRetryAfterSeconds} from '../features/http-client/parse-retry-after-seconds'

it('should reject scientific-notation Retry-After values', () => {
  expect(parseRetryAfterSeconds('1e2')).toBeNull()
})
