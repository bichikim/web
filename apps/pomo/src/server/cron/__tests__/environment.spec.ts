import {expect, it} from 'vitest'

import {getCronSecret, isAuthorizedCronRequest} from '../environment'

it('should require a non-empty cron secret', () => {
  expect(() => getCronSecret({CRON_SECRET: ' '})).toThrow('CRON_SECRET is not set')
})

it('should authorize only the configured bearer token', () => {
  const request = new Request('https://pomo.example/api/cron', {
    headers: {authorization: 'Bearer expected'},
  })

  expect(isAuthorizedCronRequest(request, {CRON_SECRET: 'expected'})).toBe(true)
  expect(isAuthorizedCronRequest(request, {CRON_SECRET: 'different'})).toBe(false)
})
