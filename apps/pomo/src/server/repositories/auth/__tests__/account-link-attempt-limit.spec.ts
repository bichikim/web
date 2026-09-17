import {describe, expect, it} from 'vitest'

import {getAccountLinkAttemptDecision} from '../account-link-attempt-limit'

describe('getAccountLinkAttemptDecision', () => {
  const windowStartedAt = new Date('2026-08-24T00:00:00.000Z')

  it('should start a new window for the first attempt', () => {
    const now = new Date('2026-08-24T00:01:00.000Z')

    expect(getAccountLinkAttemptDecision(undefined, now)).toEqual({
      attemptCount: 1,
      status: 'allowed',
      windowStartedAt: now,
    })
  })

  it('should allow five attempts within the current window', () => {
    expect(
      getAccountLinkAttemptDecision(
        {attemptCount: 4, windowStartedAt},
        new Date('2026-08-24T00:00:10.000Z'),
      ),
    ).toEqual({attemptCount: 5, status: 'allowed', windowStartedAt})
  })

  it('should rate limit further attempts until the current window expires', () => {
    expect(
      getAccountLinkAttemptDecision(
        {attemptCount: 5, windowStartedAt},
        new Date('2026-08-24T00:00:10.500Z'),
      ),
    ).toEqual({retryAfterSeconds: 50, status: 'rate-limited'})
  })

  it('should reset the attempt count when the current window expires', () => {
    const now = new Date('2026-08-24T00:01:00.000Z')

    expect(getAccountLinkAttemptDecision({attemptCount: 5, windowStartedAt}, now)).toEqual({
      attemptCount: 1,
      status: 'allowed',
      windowStartedAt: now,
    })
  })
})
