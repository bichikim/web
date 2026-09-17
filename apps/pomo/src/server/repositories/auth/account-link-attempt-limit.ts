const MILLISECONDS_PER_SECOND = 1000
const WINDOW_SECONDS = 60
const MAXIMUM_ATTEMPTS = 5
const WINDOW_MILLISECONDS = WINDOW_SECONDS * MILLISECONDS_PER_SECOND

export interface AccountLinkAttemptWindow {
  readonly attemptCount: number
  readonly windowStartedAt: Date
}

interface AllowedAccountLinkAttempt {
  readonly attemptCount: number
  readonly status: 'allowed'
  readonly windowStartedAt: Date
}

interface RateLimitedAccountLinkAttempt {
  readonly retryAfterSeconds: number
  readonly status: 'rate-limited'
}

export type AccountLinkAttemptDecision = AllowedAccountLinkAttempt | RateLimitedAccountLinkAttempt

export const getAccountLinkAttemptDecision = (
  currentWindow: AccountLinkAttemptWindow | undefined,
  now: Date,
): AccountLinkAttemptDecision => {
  if (
    currentWindow === undefined ||
    currentWindow.windowStartedAt.getTime() + WINDOW_MILLISECONDS <= now.getTime()
  ) {
    return {attemptCount: 1, status: 'allowed', windowStartedAt: now}
  }

  const retryAt = currentWindow.windowStartedAt.getTime() + WINDOW_MILLISECONDS

  if (currentWindow.attemptCount >= MAXIMUM_ATTEMPTS) {
    return {
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((retryAt - now.getTime()) / MILLISECONDS_PER_SECOND),
      ),
      status: 'rate-limited',
    }
  }

  return {
    attemptCount: currentWindow.attemptCount + 1,
    status: 'allowed',
    windowStartedAt: currentWindow.windowStartedAt,
  }
}
