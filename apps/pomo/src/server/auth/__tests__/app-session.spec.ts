/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const persistMocks = vi.hoisted(() => ({
  activatePendingAppSession: vi.fn(),
  findAppSessionUserId: vi.fn(),
  revokeAppSessionRecord: vi.fn(),
  saveTossAppSession: vi.fn(),
}))
const tokenMocks = vi.hoisted(() => ({
  createOpaqueToken: vi.fn(),
  hashOpaqueToken: vi.fn(),
}))

vi.mock('../../repositories/auth', () => persistMocks)
vi.mock('../../utils/token', () => tokenMocks)

import {
  createPendingTossAppSession,
  createTossAppSession,
  getAppSessionUserId,
  resolveAppSessionUserId,
  revokeAppSession,
} from '../app-session'

const NOW = new Date('2026-08-24T00:00:00.000Z')
const TOKEN = 'session-token'
const THIRTY_DAYS_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000
const TEN_MINUTES_IN_MILLISECONDS = 10 * 60 * 1000

beforeEach(() => {
  vi.clearAllMocks()
  persistMocks.activatePendingAppSession.mockReset()
  persistMocks.findAppSessionUserId.mockReset()
  persistMocks.revokeAppSessionRecord.mockReset()
  persistMocks.saveTossAppSession.mockReset()
  tokenMocks.createOpaqueToken.mockReset()
  tokenMocks.hashOpaqueToken.mockReset()
  tokenMocks.createOpaqueToken.mockReturnValue(TOKEN)
  tokenMocks.hashOpaqueToken.mockImplementation((token: string) => `hash:${token}`)
})

describe('createTossAppSession', () => {
  it('should persist a hashed active session and return the generated token', async () => {
    persistMocks.saveTossAppSession.mockResolvedValue({userId: 'user-1'})

    await expect(createTossAppSession('toss-subject', NOW)).resolves.toEqual({
      expiresAt: new Date(NOW.getTime() + THIRTY_DAYS_IN_MILLISECONDS),
      token: TOKEN,
      userId: 'user-1',
    })
    expect(persistMocks.saveTossAppSession).toHaveBeenCalledWith({
      activation: 'active',
      expiresAt: new Date(NOW.getTime() + THIRTY_DAYS_IN_MILLISECONDS),
      now: NOW,
      providerSubject: 'toss-subject',
      tokenHash: `hash:${TOKEN}`,
    })
  })
})

describe('createPendingTossAppSession', () => {
  it('should persist a hashed pending session with a short lifetime', async () => {
    persistMocks.saveTossAppSession.mockResolvedValue({userId: 'user-1'})

    await expect(createPendingTossAppSession('toss-subject', NOW)).resolves.toEqual({
      expiresAt: new Date(NOW.getTime() + TEN_MINUTES_IN_MILLISECONDS),
      token: TOKEN,
      userId: 'user-1',
    })
    expect(persistMocks.saveTossAppSession).toHaveBeenCalledWith({
      activation: 'pending',
      expiresAt: new Date(NOW.getTime() + TEN_MINUTES_IN_MILLISECONDS),
      now: NOW,
      providerSubject: 'toss-subject',
      tokenHash: `hash:${TOKEN}`,
    })
  })
})

describe('getAppSessionUserId', () => {
  it('should look up an active session by hashed token', async () => {
    persistMocks.findAppSessionUserId.mockResolvedValue('user-id')

    await expect(getAppSessionUserId(TOKEN, NOW)).resolves.toBe('user-id')
    expect(persistMocks.findAppSessionUserId).toHaveBeenCalledWith(`hash:${TOKEN}`, NOW)
  })
})

describe('resolveAppSessionUserId', () => {
  it('should return an already active session without an activation write', async () => {
    persistMocks.findAppSessionUserId.mockResolvedValue('user-id')

    await expect(resolveAppSessionUserId(TOKEN, NOW)).resolves.toBe('user-id')
    expect(persistMocks.activatePendingAppSession).not.toHaveBeenCalled()
  })

  it('should activate one pending session for thirty days', async () => {
    persistMocks.findAppSessionUserId.mockResolvedValue(null)
    persistMocks.activatePendingAppSession.mockResolvedValue('user-id')

    await expect(resolveAppSessionUserId(TOKEN, NOW)).resolves.toBe('user-id')
    expect(persistMocks.activatePendingAppSession).toHaveBeenCalledWith({
      expiresAt: new Date(NOW.getTime() + THIRTY_DAYS_IN_MILLISECONDS),
      now: NOW,
      tokenHash: `hash:${TOKEN}`,
    })
  })

  it('should resolve a session activated by a concurrent request', async () => {
    persistMocks.findAppSessionUserId.mockResolvedValueOnce(null).mockResolvedValueOnce('user-id')
    persistMocks.activatePendingAppSession.mockResolvedValue(null)

    await expect(resolveAppSessionUserId(TOKEN, NOW)).resolves.toBe('user-id')
    expect(persistMocks.findAppSessionUserId).toHaveBeenCalledTimes(2)
  })

  it('should reject a token when it is neither active nor pending', async () => {
    persistMocks.findAppSessionUserId.mockResolvedValue(null)
    persistMocks.activatePendingAppSession.mockResolvedValue(null)

    await expect(resolveAppSessionUserId(TOKEN, NOW)).resolves.toBeNull()
  })
})

describe('revokeAppSession', () => {
  it('should revoke the hashed token', async () => {
    persistMocks.revokeAppSessionRecord.mockResolvedValue(undefined)

    await revokeAppSession(TOKEN, NOW)
    expect(persistMocks.revokeAppSessionRecord).toHaveBeenCalledWith(`hash:${TOKEN}`, NOW)
  })
})
