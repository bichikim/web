/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseRetryAfterSeconds} from '../features/http-client/parse-retry-after-seconds'
import {classifyApiAiSubmissionError} from '../server/api-ai/submission-error'

it('should not treat scientific-notation Retry-After as integer seconds when scheduling provider recovery', () => {
  const now = 1000

  expect(parseRetryAfterSeconds('1e2')).toBeNull()
  expect(
    classifyApiAiSubmissionError({headers: new Headers({'retry-after': '1e2'}), status: 429}, now),
  ).toMatchObject({retryAt: now + 30_000})
})
