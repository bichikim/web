import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getAppSessionUserId} from '../repository'
import {hashOpaqueToken} from '../token'

const databaseMocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))

vi.mock('../../database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../database')>()

  return {
    ...actual,
    getDatabase: databaseMocks.getDatabase,
    withTransactionalDatabase: databaseMocks.withTransactionalDatabase,
  }
})

describe('getAppSessionUserId', () => {
  const limit = vi.fn()
  const where = vi.fn((_predicate: SQL) => ({limit}))
  const from = vi.fn(() => ({where}))
  const select = vi.fn(() => ({from}))
  const readWhereQuery = (callIndex: number) => {
    const call = where.mock.calls[callIndex]

    if (call === undefined) {
      throw new Error(`Missing where call at index ${callIndex}`)
    }

    return new PgDialect({casing: 'snake_case'}).sqlToQuery(call[0])
  }

  beforeEach(() => {
    limit.mockReset()
    where.mockClear()
    from.mockClear()
    select.mockClear()
    databaseMocks.getDatabase.mockReset().mockReturnValue({select})
    databaseMocks.withTransactionalDatabase.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should authenticate an active session with one HTTP read and no write transaction', async () => {
    const now = new Date('2026-08-24T00:00:00.000Z')
    limit.mockResolvedValue([{userId: 'user-id'}])

    await expect(getAppSessionUserId('app-token', now)).resolves.toBe('user-id')

    expect(databaseMocks.getDatabase).toHaveBeenCalledOnce()
    expect(select).toHaveBeenCalledOnce()
    expect(from).toHaveBeenCalledOnce()
    expect(where).toHaveBeenCalledOnce()
    expect(limit).toHaveBeenCalledWith(1)
    expect(databaseMocks.withTransactionalDatabase).not.toHaveBeenCalled()

    const query = readWhereQuery(0)

    expect(query.sql).toBe(
      [
        '("pomo_app_sessions"."token_hash" = $1',
        'and "pomo_app_sessions"."revoked_at" is null',
        'and "pomo_app_sessions"."expires_at" > $2)',
      ].join(' '),
    )
    expect(query.params).toEqual([hashOpaqueToken('app-token'), now.toISOString()])
  })

  it('should reject a token when the active session query returns no result', async () => {
    limit.mockResolvedValue([])

    await expect(getAppSessionUserId('invalid-token')).resolves.toBeNull()

    expect(select).toHaveBeenCalledOnce()
    expect(databaseMocks.withTransactionalDatabase).not.toHaveBeenCalled()
  })

  it('should validate concurrent and rotated tokens without write contention', async () => {
    limit.mockResolvedValue([{userId: 'user-id'}])

    await expect(
      Promise.all([getAppSessionUserId('previous-token'), getAppSessionUserId('rotated-token')]),
    ).resolves.toEqual(['user-id', 'user-id'])

    expect(select).toHaveBeenCalledTimes(2)
    expect(databaseMocks.withTransactionalDatabase).not.toHaveBeenCalled()

    const queries = where.mock.calls.map((_call, callIndex) => readWhereQuery(callIndex))
    expect(queries.map(({params}) => params[0])).toEqual([
      hashOpaqueToken('previous-token'),
      hashOpaqueToken('rotated-token'),
    ])
  })
})
