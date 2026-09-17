/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const persistMocks = vi.hoisted(() => ({
  consumeAccountLinkChallenge: vi.fn(),
  deleteAccountLinkChallenge: vi.fn(),
  saveAccountLinkChallenge: vi.fn(),
}))
const tokenMocks = vi.hoisted(() => ({
  createOpaqueToken: vi.fn(),
  hashOpaqueToken: vi.fn(),
}))

vi.mock('../../repositories/auth', () => persistMocks)
vi.mock('../../utils/token', () => tokenMocks)

import {
  completeAccountLink,
  createAccountLinkChallenge,
  invalidateAccountLinkChallenge,
} from '../account-link'

const NOW = new Date('2026-08-24T00:00:00.000Z')
const TOKEN = 'challenge-token'
const THIRTY_MINUTES_IN_MILLISECONDS = 30 * 60 * 1000

beforeEach(() => {
  vi.clearAllMocks()
  persistMocks.consumeAccountLinkChallenge.mockReset()
  persistMocks.deleteAccountLinkChallenge.mockReset()
  persistMocks.saveAccountLinkChallenge.mockReset()
  tokenMocks.createOpaqueToken.mockReset()
  tokenMocks.hashOpaqueToken.mockReset()
  tokenMocks.createOpaqueToken.mockReturnValue(TOKEN)
  tokenMocks.hashOpaqueToken.mockImplementation((value: string) => `hash:${value}`)
})

describe('createAccountLinkChallenge', () => {
  it('should persist hashed challenge values and return the generated token', async () => {
    persistMocks.saveAccountLinkChallenge.mockResolvedValue({status: 'created'})
    const expiresAt = new Date(NOW.getTime() + THIRTY_MINUTES_IN_MILLISECONDS)

    await expect(
      createAccountLinkChallenge('user-1', '  User@Example.COM  ', NOW),
    ).resolves.toEqual({
      expiresAt,
      status: 'created',
      token: TOKEN,
    })
    expect(persistMocks.saveAccountLinkChallenge).toHaveBeenCalledWith({
      emailHash: 'hash:user@example.com',
      expiresAt,
      now: NOW,
      tokenHash: `hash:${TOKEN}`,
      userId: 'user-1',
    })
  })

  it('should return a rate limit without exposing a challenge token', async () => {
    persistMocks.saveAccountLinkChallenge.mockResolvedValue({
      retryAfterSeconds: 42,
      status: 'rate-limited',
    })

    await expect(createAccountLinkChallenge('user-1', 'user@example.com', NOW)).resolves.toEqual({
      retryAfterSeconds: 42,
      status: 'rate-limited',
    })
  })
})

describe('invalidateAccountLinkChallenge', () => {
  it('should delete the challenge by hashed token', async () => {
    persistMocks.deleteAccountLinkChallenge.mockResolvedValue(undefined)

    await invalidateAccountLinkChallenge(TOKEN)
    expect(persistMocks.deleteAccountLinkChallenge).toHaveBeenCalledWith(`hash:${TOKEN}`)
  })
})

describe('completeAccountLink', () => {
  it('should consume the challenge with hashed token and normalized email', async () => {
    persistMocks.consumeAccountLinkChallenge.mockResolvedValue({
      status: 'linked',
      userId: 'user-1',
    })

    await expect(
      completeAccountLink(TOKEN, 'neon-subject', '  USER@Example.COM ', NOW),
    ).resolves.toEqual({status: 'linked', userId: 'user-1'})
    expect(persistMocks.consumeAccountLinkChallenge).toHaveBeenCalledWith({
      emailHash: 'hash:user@example.com',
      neonSubject: 'neon-subject',
      now: NOW,
      tokenHash: `hash:${TOKEN}`,
    })
  })

  it('should use the same email hash for canonically equivalent addresses', async () => {
    persistMocks.saveAccountLinkChallenge.mockResolvedValue({status: 'created'})
    persistMocks.consumeAccountLinkChallenge.mockResolvedValue({
      status: 'linked',
      userId: 'user-1',
    })
    const composedEmail = 'café@example.com'
    const decomposedEmail = 'cafe\u0301@example.com'

    await createAccountLinkChallenge('user-1', composedEmail, NOW)
    await completeAccountLink(TOKEN, 'neon-subject', decomposedEmail, NOW)

    expect(persistMocks.saveAccountLinkChallenge).toHaveBeenCalledWith(
      expect.objectContaining({emailHash: `hash:${composedEmail}`}),
    )
    expect(persistMocks.consumeAccountLinkChallenge).toHaveBeenCalledWith(
      expect.objectContaining({emailHash: `hash:${composedEmail}`}),
    )
  })

  it('should preserve compatibility-distinct email hashes', async () => {
    persistMocks.saveAccountLinkChallenge.mockResolvedValue({status: 'created'})
    persistMocks.consumeAccountLinkChallenge.mockResolvedValue({
      status: 'linked',
      userId: 'user-1',
    })
    const asciiEmail = 'ffi@example.com'
    const compatibilityEmail = 'ﬃ@example.com'

    await createAccountLinkChallenge('user-1', asciiEmail, NOW)
    await completeAccountLink(TOKEN, 'neon-subject', compatibilityEmail, NOW)

    expect(persistMocks.saveAccountLinkChallenge).toHaveBeenCalledWith(
      expect.objectContaining({emailHash: `hash:${asciiEmail}`}),
    )
    expect(persistMocks.consumeAccountLinkChallenge).toHaveBeenCalledWith(
      expect.objectContaining({emailHash: `hash:${compatibilityEmail}`}),
    )
  })
})
