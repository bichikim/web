import {
  activatePendingAppSession,
  findAppSessionUserId,
  revokeAppSessionRecord,
  saveTossAppSession,
} from '../repositories/auth'
import {createOpaqueToken, hashOpaqueToken} from '../utils/token'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const APP_SESSION_DAYS = 30
const PENDING_SESSION_MINUTES = 10
const APP_SESSION_LIFETIME =
  APP_SESSION_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const PENDING_SESSION_LIFETIME =
  PENDING_SESSION_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export interface AppSession {
  readonly expiresAt: Date
  readonly token: string
  readonly userId: string
}

const createTossSession = async (
  providerSubject: string,
  activation: 'active' | 'pending',
  now: Date,
): Promise<AppSession> => {
  const token = createOpaqueToken()
  const lifetime = activation === 'active' ? APP_SESSION_LIFETIME : PENDING_SESSION_LIFETIME
  const expiresAt = new Date(now.getTime() + lifetime)
  const {userId} = await saveTossAppSession({
    activation,
    expiresAt,
    now,
    providerSubject,
    tokenHash: hashOpaqueToken(token),
  })

  return {expiresAt, token, userId}
}

export const createTossAppSession = async (
  providerSubject: string,
  now: Date = new Date(),
): Promise<AppSession> => createTossSession(providerSubject, 'active', now)

export const createPendingTossAppSession = async (
  providerSubject: string,
  now: Date = new Date(),
): Promise<AppSession> => createTossSession(providerSubject, 'pending', now)

export const getAppSessionUserId = async (
  token: string,
  now: Date = new Date(),
): Promise<string | null> => findAppSessionUserId(hashOpaqueToken(token), now)

export const resolveAppSessionUserId = async (
  token: string,
  now: Date = new Date(),
): Promise<string | null> => {
  const tokenHash = hashOpaqueToken(token)
  const activeUserId = await findAppSessionUserId(tokenHash, now)

  if (activeUserId !== null) {
    return activeUserId
  }

  return (
    (await activatePendingAppSession({
      expiresAt: new Date(now.getTime() + APP_SESSION_LIFETIME),
      now,
      tokenHash,
    })) ?? findAppSessionUserId(tokenHash, now)
  )
}

export const revokeAppSession = async (token: string, now: Date = new Date()): Promise<void> => {
  await revokeAppSessionRecord(hashOpaqueToken(token), now)
}
