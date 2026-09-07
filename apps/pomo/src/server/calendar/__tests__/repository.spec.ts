import {createHash} from 'node:crypto'
import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'
import {beforeEach, expect, it, vi} from 'vitest'

import {calendarRepository} from '../repository'

const mocks = vi.hoisted(() => ({getDatabase: vi.fn(), withTransactionalDatabase: vi.fn()}))
vi.mock('src/env', () => ({env: {}}))
vi.mock('src/server/database', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/server/database')>()),
  ...mocks,
}))

const returning = vi.fn()
const limit = vi.fn()
const where = vi.fn()
const from = vi.fn()
const select = vi.fn()
const values = vi.fn()
const upsert = vi.fn()
const insert = vi.fn()
const remove = vi.fn()
const update = vi.fn()
const set = vi.fn()
const execute = vi.fn()
const database = {delete: remove, execute, insert, select, update}
const query = (value: SQL) => new PgDialect({casing: 'snake_case'}).sqlToQuery(value)

beforeEach(() => {
  vi.resetAllMocks()
  returning.mockResolvedValue([])
  limit.mockResolvedValue([])
  where.mockReturnValue({limit, returning})
  from.mockReturnValue({where})
  select.mockReturnValue({from})
  values.mockReturnValue({onConflictDoUpdate: upsert})
  insert.mockReturnValue({values})
  remove.mockReturnValue({where})
  update.mockReturnValue({set})
  set.mockReturnValue({where})
  mocks.getDatabase.mockReturnValue(database)
  mocks.withTransactionalDatabase.mockImplementation((operation) =>
    operation({
      transaction: (transaction: (database: unknown) => unknown) => transaction(database),
    }),
  )
})

it('should persist a hashed OAuth state with a matching PKCE challenge and expiry', async () => {
  const startedAt = Date.now()
  const options = {
    provider: 'google' as const,
    redirectUri: 'https://pomofi.io/callback',
    userId: 'user-1',
  }
  const result = await calendarRepository.createOauthState(options)
  const stored = values.mock.calls[0][0]
  expect(stored).toMatchObject(options)
  expect(stored.stateHash).toBe(createHash('sha256').update(result.state).digest('hex'))
  expect(stored.stateHash).not.toBe(result.state)
  expect(stored.expiresAt.getTime()).toBeGreaterThanOrEqual(startedAt + 600_000)
  expect(stored.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 600_000)
  expect(result.codeChallenge).toBe(
    createHash('sha256').update(stored.codeVerifier).digest('base64url'),
  )
})

it.each([true, false])(
  'should consume only an unexpired matching OAuth state: %s',
  async (found) => {
    const state = {
      codeVerifier: 'verifier',
      redirectUri: 'https://pomofi.io/callback',
      userId: 'user-1',
    }
    returning.mockResolvedValue(found ? [state] : [])
    const now = new Date('2026-09-05T00:00:00Z')
    expect(await calendarRepository.consumeOauthState('google', 'token', now)).toEqual(
      found ? state : null,
    )
    const filter = query(where.mock.calls[0][0])
    expect(filter.sql).toContain('"expires_at" >')
    expect(filter.params).toEqual([
      'google',
      createHash('sha256').update('token').digest('hex'),
      now.toISOString(),
    ])
  },
)

it.each([true, false])(
  'should restrict connection deletion to its owner and report deletion: %s',
  async (found) => {
    returning.mockResolvedValue(found ? [{id: 'connection-1'}] : [])
    expect(await calendarRepository.deleteConnection('user-1', 'connection-1')).toBe(found)
    expect(query(where.mock.calls[0][0]).params).toEqual(['connection-1', 'user-1'])
  },
)

it('should list only the requested user connections', async () => {
  const connections = [{encryptedTokens: 'sealed', id: 'connection-1'}]
  where.mockResolvedValue(connections)
  expect(await calendarRepository.listConnections('user-1')).toEqual(connections)
  expect(query(where.mock.calls[0][0]).params).toEqual(['user-1'])
})

it('should upsert account labels and encrypted tokens for the same provider identity', async () => {
  const options = {
    accountLabel: 'person@example.com',
    encryptedTokens: 'sealed',
    provider: 'google' as const,
    providerSubject: 'subject',
    userId: 'user-1',
  }
  await calendarRepository.saveConnection(options)
  expect(values).toHaveBeenCalledWith(options)
  expect(upsert).toHaveBeenCalledWith({
    set: {
      accountLabel: options.accountLabel,
      encryptedTokens: 'sealed',
      updatedAt: expect.any(Date),
    },
    target: expect.any(Array),
  })
  expect(upsert.mock.calls[0][0].target.map((column: {name: string}) => column.name)).toEqual([
    'userId',
    'provider',
    'providerSubject',
  ])
})

it.each(['old', 'new'])(
  'should lock the connection before refreshing tokens and persist only changed values: %s',
  async (next) => {
    limit.mockResolvedValue([{encryptedTokens: 'old'}])
    const operation = vi.fn().mockResolvedValue(next)
    expect(await calendarRepository.withLockedTokens('connection-1', operation)).toBe(next)
    expect(query(execute.mock.calls[0][0]).params).toEqual(['calendar:connection-1'])
    expect(execute.mock.invocationCallOrder[0]).toBeLessThan(select.mock.invocationCallOrder[0])
    expect(operation).toHaveBeenCalledWith('old')
    expect(update).toHaveBeenCalledTimes(next === 'old' ? 0 : 1)
    if (next !== 'old') {
      expect(set).toHaveBeenCalledWith({encryptedTokens: 'new', updatedAt: expect.any(Date)})
    }
  },
)

it('should reject a missing connection without running a token refresh', async () => {
  const operation = vi.fn()
  await expect(calendarRepository.withLockedTokens('missing', operation)).rejects.toThrow(
    'Calendar connection no longer exists',
  )
  expect(operation).not.toHaveBeenCalled()
})

it('should propagate refresh errors without persisting tokens', async () => {
  limit.mockResolvedValue([{encryptedTokens: 'old'}])
  const error = new Error('Refresh failed')
  await expect(
    calendarRepository.withLockedTokens('connection-1', vi.fn().mockRejectedValue(error)),
  ).rejects.toBe(error)
  expect(update).not.toHaveBeenCalled()
})
