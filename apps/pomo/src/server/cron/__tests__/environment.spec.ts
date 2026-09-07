import {afterEach, expect, it, vi} from 'vitest'

const environmentMocks = vi.hoisted(() => ({
  env: {CRON_SECRET: 'cron-secret-1234'},
}))

vi.mock('src/env', () => ({
  env: environmentMocks.env,
}))

import {isAuthorizedCronRequest} from '../environment'

afterEach(() => {
  environmentMocks.env.CRON_SECRET = 'cron-secret-1234'
})

it('should authorize only the configured bearer token', () => {
  const request = new Request('https://pomo.example/api/cron', {
    headers: {authorization: 'Bearer cron-secret-1234'},
  })

  expect(isAuthorizedCronRequest(request)).toBe(true)

  environmentMocks.env.CRON_SECRET = 'cron-secret-5678'
  expect(isAuthorizedCronRequest(request)).toBe(false)
})

it('should reject a request without an authorization header', () => {
  expect(isAuthorizedCronRequest(new Request('https://pomo.example/api/cron'))).toBe(false)
})
