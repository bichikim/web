import {
  type CompleteAccountLinkResult,
  consumeAccountLinkChallenge,
  deleteAccountLinkChallenge,
  saveAccountLinkChallenge,
} from '../repositories/auth'
import {createOpaqueToken, hashOpaqueToken} from '../utils/token'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const LINK_CHALLENGE_MINUTES = 30
const LINK_CHALLENGE_LIFETIME =
  LINK_CHALLENGE_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export type {CompleteAccountLinkResult}

interface CreatedAccountLinkChallenge {
  readonly expiresAt: Date
  readonly status: 'created'
  readonly token: string
}

interface RateLimitedAccountLinkChallenge {
  readonly retryAfterSeconds: number
  readonly status: 'rate-limited'
}

export type CreateAccountLinkChallengeResult =
  | CreatedAccountLinkChallenge
  | RateLimitedAccountLinkChallenge

const normalizeEmailAddress = (email: string): string =>
  email.normalize('NFKC').trim().toLowerCase()

export const createAccountLinkChallenge = async (
  userId: string,
  email: string,
  now: Date = new Date(),
): Promise<CreateAccountLinkChallengeResult> => {
  const token = createOpaqueToken()
  const expiresAt = new Date(now.getTime() + LINK_CHALLENGE_LIFETIME)
  const result = await saveAccountLinkChallenge({
    emailHash: hashOpaqueToken(normalizeEmailAddress(email)),
    expiresAt,
    now,
    tokenHash: hashOpaqueToken(token),
    userId,
  })

  switch (result.status) {
    case 'created':
      return {expiresAt, status: 'created', token}
    case 'rate-limited':
      return result
    default: {
      const unhandledStatus: never = result
      throw new Error(`Unhandled account link challenge status: ${unhandledStatus}`)
    }
  }
}

export const invalidateAccountLinkChallenge = async (token: string): Promise<void> => {
  await deleteAccountLinkChallenge(hashOpaqueToken(token))
}

export const completeAccountLink = async (
  token: string,
  neonSubject: string,
  neonEmail: string,
  now: Date = new Date(),
): Promise<CompleteAccountLinkResult> =>
  consumeAccountLinkChallenge({
    emailHash: hashOpaqueToken(normalizeEmailAddress(neonEmail)),
    neonSubject,
    now,
    tokenHash: hashOpaqueToken(token),
  })
