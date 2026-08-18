import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {withTransactionalDatabase} from '..'

const databaseMocks = vi.hoisted(() => ({
  drizzleServerless: vi.fn(),
  getDatabaseUrl: vi.fn(),
}))

vi.mock('drizzle-orm/neon-serverless', () => ({drizzle: databaseMocks.drizzleServerless}))
vi.mock('../environment', () => ({getDatabaseUrl: databaseMocks.getDatabaseUrl}))

describe('withTransactionalDatabase', () => {
  const end = vi.fn()
  const database = {$client: {end}}

  beforeEach(() => {
    end.mockReset().mockResolvedValue(undefined)
    databaseMocks.drizzleServerless.mockReset().mockReturnValue(database)
    databaseMocks.getDatabaseUrl.mockReset().mockReturnValue('postgresql://example.test/pomo')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should close its WebSocket pool after the operation succeeds', async () => {
    const operation = vi.fn().mockResolvedValue('published')

    await expect(withTransactionalDatabase(operation)).resolves.toBe('published')
    expect(operation).toHaveBeenCalledWith(database)
    expect(end).toHaveBeenCalledOnce()
  })

  it('should close its WebSocket pool after the operation fails', async () => {
    const error = new Error('transaction failed')

    await expect(withTransactionalDatabase(vi.fn().mockRejectedValue(error))).rejects.toBe(error)
    expect(end).toHaveBeenCalledOnce()
  })
})
