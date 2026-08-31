import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  completeAccountLink,
  createAccountLinkChallenge,
  createTossAppSession,
  findOrCreateNeonUser,
  getAppSessionUserId,
  invalidateAccountLinkChallenge,
  revokeAppSession,
  revokeTossAppSessions,
} from '../repository'
import {hashOpaqueToken} from '../token'

const dependencyMocks = vi.hoisted(() => ({
  getAccountLinkAttemptDecision: vi.fn(),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../database')>()

  return {
    ...actual,
    getDatabase: dependencyMocks.getDatabase,
    withTransactionalDatabase: dependencyMocks.withTransactionalDatabase,
  }
})

vi.mock('../account-link-attempt-limit', () => ({
  getAccountLinkAttemptDecision: dependencyMocks.getAccountLinkAttemptDecision,
}))

const readLimit = vi.fn()
const readWhere = vi.fn()
const readFrom = vi.fn()
const readSelect = vi.fn()

const limit = vi.fn()
const orderBy = vi.fn()
const where = vi.fn()
const from = vi.fn()
const select = vi.fn()
const returning = vi.fn()
const onConflictDoUpdate = vi.fn()
const values = vi.fn()
const insert = vi.fn()
const writeWhere = vi.fn()
const set = vi.fn()
const update = vi.fn()
const deleteWhere = vi.fn()
const delete_ = vi.fn()
const execute = vi.fn()
const transaction = vi.fn()

const transactionalDatabase = {
  delete: delete_,
  execute,
  insert,
  select,
  transaction,
  update,
}

const NOW = new Date('2026-08-24T00:00:00.000Z')
const THIRTY_DAYS_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000
const THIRTY_MINUTES_IN_MILLISECONDS = 30 * 60 * 1000

const readSqlQuery = (sqlValue: SQL) => new PgDialect({casing: 'snake_case'}).sqlToQuery(sqlValue)

const readWhereQuery = (callIndex: number) => {
  const call = readWhere.mock.calls[callIndex]

  if (call === undefined) {
    throw new Error(`Missing where call at index ${callIndex}`)
  }

  return readSqlQuery(call[0])
}

const queueTransactionReads = (...results: ReadonlyArray<ReadonlyArray<unknown>>) => {
  for (const result of results) {
    limit.mockResolvedValueOnce(result)
  }
}

beforeEach(() => {
  vi.resetAllMocks()

  readWhere.mockReturnValue({limit: readLimit})
  readFrom.mockReturnValue({where: readWhere})
  readSelect.mockReturnValue({from: readFrom})
  dependencyMocks.getDatabase.mockReturnValue({select: readSelect})

  orderBy.mockReturnValue({limit})
  where.mockReturnValue({limit, orderBy})
  from.mockReturnValue({where})
  select.mockReturnValue({from})
  values.mockReturnValue({onConflictDoUpdate, returning})
  insert.mockReturnValue({values})
  set.mockReturnValue({where: writeWhere})
  update.mockReturnValue({set})
  delete_.mockReturnValue({where: deleteWhere})
  transaction.mockImplementation(
    async (operation: (database: typeof transactionalDatabase) => Promise<unknown>) =>
      operation(transactionalDatabase),
  )
  dependencyMocks.withTransactionalDatabase.mockImplementation(
    async (operation: (database: typeof transactionalDatabase) => Promise<unknown>) =>
      operation(transactionalDatabase),
  )
  dependencyMocks.getAccountLinkAttemptDecision.mockReturnValue({
    attemptCount: 1,
    status: 'allowed',
    windowStartedAt: NOW,
  })
})

describe('app sessions', () => {
  it('should authenticate an active session with one HTTP read and no write transaction', async () => {
    readLimit.mockResolvedValue([{userId: 'user-id'}])

    await expect(getAppSessionUserId('app-token', NOW)).resolves.toBe('user-id')

    expect(dependencyMocks.getDatabase).toHaveBeenCalledOnce()
    expect(readSelect).toHaveBeenCalledOnce()
    expect(readFrom).toHaveBeenCalledOnce()
    expect(readWhere).toHaveBeenCalledOnce()
    expect(readLimit).toHaveBeenCalledWith(1)
    expect(dependencyMocks.withTransactionalDatabase).not.toHaveBeenCalled()

    const query = readWhereQuery(0)

    expect(query.sql).toBe(
      [
        '("pomo_app_sessions"."token_hash" = $1',
        'and "pomo_app_sessions"."revoked_at" is null',
        'and "pomo_app_sessions"."expires_at" > $2)',
      ].join(' '),
    )
    expect(query.params).toEqual([hashOpaqueToken('app-token'), NOW.toISOString()])
  })

  it('should reject a token when the active session query returns no result', async () => {
    readLimit.mockResolvedValue([])

    await expect(getAppSessionUserId('invalid-token')).resolves.toBeNull()

    expect(readSelect).toHaveBeenCalledOnce()
    expect(dependencyMocks.withTransactionalDatabase).not.toHaveBeenCalled()
  })

  it('should validate concurrent and rotated tokens without write contention', async () => {
    readLimit.mockResolvedValue([{userId: 'user-id'}])

    await expect(
      Promise.all([getAppSessionUserId('previous-token'), getAppSessionUserId('rotated-token')]),
    ).resolves.toEqual(['user-id', 'user-id'])

    expect(readSelect).toHaveBeenCalledTimes(2)
    expect(dependencyMocks.withTransactionalDatabase).not.toHaveBeenCalled()

    const queries = readWhere.mock.calls.map((_call, callIndex) => readWhereQuery(callIndex))
    expect(queries.map(({params}) => params[0])).toEqual([
      hashOpaqueToken('previous-token'),
      hashOpaqueToken('rotated-token'),
    ])
  })

  it('should create a session for an existing Toss identity using default dependencies', async () => {
    queueTransactionReads([{userId: 'user-1'}])

    const result = await createTossAppSession('toss-subject')

    expect(result.userId).toBe('user-1')
    expect(result.token).toHaveLength(43)
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(execute).toHaveBeenCalledOnce()
    expect(values).toHaveBeenCalledWith({
      expiresAt: result.expiresAt,
      tokenHash: hashOpaqueToken(result.token),
      userId: 'user-1',
    })
  })

  it('should create a Pomo user and Toss identity before creating the session', async () => {
    queueTransactionReads([])
    returning.mockResolvedValue([{id: 'user-2'}])

    await expect(
      createTossAppSession('new-toss-subject', {
        createToken: () => 'session-token',
        now: () => NOW,
      }),
    ).resolves.toEqual({
      expiresAt: new Date(NOW.getTime() + THIRTY_DAYS_IN_MILLISECONDS),
      token: 'session-token',
      userId: 'user-2',
    })
    expect(values).toHaveBeenCalledWith({
      provider: 'toss',
      providerSubject: 'new-toss-subject',
      userId: 'user-2',
    })
  })

  it('should fail session creation when a new user row is not returned', async () => {
    queueTransactionReads([])
    returning.mockResolvedValue([])

    await expect(
      createTossAppSession('new-toss-subject', {
        createToken: () => 'session-token',
        now: () => NOW,
      }),
    ).rejects.toThrow('Failed to create a Pomo user')
  })

  it('should revoke one token with explicit and default timestamps', async () => {
    await revokeAppSession('first-token', NOW)
    await revokeAppSession('second-token')

    expect(update).toHaveBeenCalledTimes(2)
    expect(set).toHaveBeenNthCalledWith(1, {revokedAt: NOW})
    expect(set.mock.calls[1]?.[0]).toEqual({revokedAt: expect.any(Date)})
    expect(writeWhere).toHaveBeenCalledTimes(2)
  })

  it('should leave sessions unchanged when a Toss identity does not exist', async () => {
    queueTransactionReads([])

    await revokeTossAppSessions('missing-subject')

    expect(execute).toHaveBeenCalledOnce()
    expect(update).not.toHaveBeenCalled()
  })

  it('should revoke all active sessions for an existing Toss identity', async () => {
    queueTransactionReads([{userId: 'user-1'}])

    await revokeTossAppSessions('toss-subject', NOW)

    expect(set).toHaveBeenCalledWith({revokedAt: NOW})
    expect(writeWhere).toHaveBeenCalledOnce()
  })
})

describe('account link challenge creation', () => {
  it('should apply the cooldown when a recent challenge exists with default dependencies', async () => {
    queueTransactionReads([{createdAt: new Date()}])

    await expect(createAccountLinkChallenge('user-1', 'User@Example.com')).resolves.toMatchObject({
      retryAfterSeconds: expect.any(Number),
      status: 'rate-limited',
    })
    expect(dependencyMocks.getAccountLinkAttemptDecision).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('should return the account attempt limit without replacing the challenge', async () => {
    const attemptWindow = {attemptCount: 5, windowStartedAt: NOW}
    queueTransactionReads([], [attemptWindow])
    dependencyMocks.getAccountLinkAttemptDecision.mockReturnValue({
      retryAfterSeconds: 42,
      status: 'rate-limited',
    })

    await expect(
      createAccountLinkChallenge('user-1', 'user@example.com', {
        createToken: () => 'challenge-token',
        now: () => NOW,
      }),
    ).resolves.toEqual({retryAfterSeconds: 42, status: 'rate-limited'})
    expect(dependencyMocks.getAccountLinkAttemptDecision).toHaveBeenCalledWith(attemptWindow, NOW)
    expect(onConflictDoUpdate).not.toHaveBeenCalled()
    expect(delete_).not.toHaveBeenCalled()
  })

  it('should record an allowed attempt and replace stale challenges with a normalized email', async () => {
    const windowStartedAt = new Date('2026-08-23T23:59:30.000Z')
    const currentWindow = {attemptCount: 1, windowStartedAt}
    queueTransactionReads([], [currentWindow])
    dependencyMocks.getAccountLinkAttemptDecision.mockReturnValue({
      attemptCount: 2,
      status: 'allowed',
      windowStartedAt,
    })

    await expect(
      createAccountLinkChallenge('user-1', '  User@Example.COM  ', {
        createToken: () => 'challenge-token',
        now: () => NOW,
      }),
    ).resolves.toEqual({
      expiresAt: new Date(NOW.getTime() + THIRTY_MINUTES_IN_MILLISECONDS),
      status: 'created',
      token: 'challenge-token',
    })
    expect(onConflictDoUpdate).toHaveBeenCalledOnce()
    expect(deleteWhere).toHaveBeenCalledOnce()
    expect(values).toHaveBeenCalledWith({
      emailHash: hashOpaqueToken('user@example.com'),
      expiresAt: new Date(NOW.getTime() + THIRTY_MINUTES_IN_MILLISECONDS),
      tokenHash: hashOpaqueToken('challenge-token'),
      userId: 'user-1',
    })
  })

  it('should invalidate a challenge by its hashed token', async () => {
    await invalidateAccountLinkChallenge('challenge-token')

    expect(delete_).toHaveBeenCalledOnce()
    const call = deleteWhere.mock.calls[0]

    if (call === undefined) {
      throw new Error('Missing challenge invalidation predicate')
    }

    expect(readSqlQuery(call[0]).params).toEqual([hashOpaqueToken('challenge-token')])
  })
})

describe('account link completion', () => {
  const challenge = {id: 'challenge-1', userId: 'user-1'}

  it('should reject a missing or expired challenge using the default timestamp', async () => {
    queueTransactionReads([])

    await expect(
      completeAccountLink('challenge-token', 'neon-subject', 'user@example.com'),
    ).resolves.toEqual({status: 'invalid-challenge'})
    expect(update).not.toHaveBeenCalled()
  })

  it('should reject a Neon identity linked to another user', async () => {
    queueTransactionReads([challenge], [{userId: 'other-user'}])

    await expect(
      completeAccountLink('challenge-token', 'neon-subject', 'user@example.com', NOW),
    ).resolves.toEqual({status: 'identity-conflict'})
    expect(update).not.toHaveBeenCalled()
  })

  it('should consume the challenge when the Neon identity already belongs to the user', async () => {
    queueTransactionReads([challenge], [{userId: 'user-1'}])

    await expect(
      completeAccountLink('challenge-token', 'neon-subject', 'user@example.com', NOW),
    ).resolves.toEqual({status: 'linked', userId: 'user-1'})
    expect(insert).not.toHaveBeenCalled()
    expect(set).toHaveBeenCalledWith({consumedAt: NOW})
  })

  it('should reject a user that already has another Neon identity', async () => {
    queueTransactionReads([challenge], [], [{id: 'identity-1'}])

    await expect(
      completeAccountLink('challenge-token', 'neon-subject', 'user@example.com', NOW),
    ).resolves.toEqual({status: 'identity-conflict'})
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('should insert a new Neon identity and consume the challenge', async () => {
    queueTransactionReads([challenge], [], [])

    await expect(
      completeAccountLink('challenge-token', 'neon-subject', '  USER@Example.COM ', NOW),
    ).resolves.toEqual({status: 'linked', userId: 'user-1'})
    expect(values).toHaveBeenCalledWith({
      provider: 'neon',
      providerSubject: 'neon-subject',
      userId: 'user-1',
    })
    expect(set).toHaveBeenCalledWith({consumedAt: NOW})
  })
})

describe('Neon user lookup', () => {
  it('should return an existing Neon user through the transactional lookup', async () => {
    queueTransactionReads([{userId: 'user-1'}])

    await expect(findOrCreateNeonUser('neon-subject')).resolves.toBe('user-1')

    expect(transaction).toHaveBeenCalledOnce()
    expect(execute).toHaveBeenCalledOnce()
  })
})
