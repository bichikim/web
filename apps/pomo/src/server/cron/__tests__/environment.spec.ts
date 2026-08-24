import {expect, it} from 'vitest'

import {getCronSecret, isAuthorizedCronRequest} from '../environment'

it.each([
  {error: 'CRON_SECRET is not set', secret: ' '},
  {error: 'CRON_SECRET must contain at least 16 characters', secret: 'too-short'},
])('should reject an invalid cron secret', ({error, secret}) => {
  expect(() => getCronSecret({CRON_SECRET: secret})).toThrow(error)
})

it('should authorize only the configured bearer token', () => {
  const request = new Request('https://pomo.example/api/cron', {
    headers: {authorization: 'Bearer cron-secret-1234'},
  })

  expect(isAuthorizedCronRequest(request, {CRON_SECRET: 'cron-secret-1234'})).toBe(true)
  expect(isAuthorizedCronRequest(request, {CRON_SECRET: 'cron-secret-5678'})).toBe(false)
})
