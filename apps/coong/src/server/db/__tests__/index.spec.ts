import {describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({drizzle: vi.fn(), getPostgresUrl: vi.fn(), postgres: vi.fn()}))

vi.mock('drizzle-orm/postgres-js', () => ({drizzle: mocks.drizzle}))
vi.mock('postgres', () => ({default: mocks.postgres}))
vi.mock('src/env', () => ({getPostgresUrl: mocks.getPostgresUrl}))

describe('database entry', () => {
  it('should create a snake-case Drizzle client from the configured URL', async () => {
    const client = {name: 'postgres-client'}
    const database = {name: 'database'}
    mocks.getPostgresUrl.mockReturnValue('postgres://database')
    mocks.postgres.mockReturnValue(client)
    mocks.drizzle.mockReturnValue(database)

    const {db} = await import('../index')

    expect(db).toBe(database)
    expect(mocks.postgres).toHaveBeenCalledWith('postgres://database')
    expect(mocks.drizzle).toHaveBeenCalledWith({casing: 'snake_case', client})
  })
})
