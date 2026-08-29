import {afterEach, describe, expect, it, vi} from 'vitest'

import {getDatabaseUrl, getPostgresUrl} from '../database'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('database environment', () => {
  it('should read database connection URLs', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://generic')
    vi.stubEnv('POSTGRES_URL', 'postgres://postgres-driver')

    expect(getDatabaseUrl()).toBe('postgres://generic')
    expect(getPostgresUrl()).toBe('postgres://postgres-driver')
  })

  it('should reject missing database connection URLs', () => {
    vi.stubEnv('DATABASE_URL', undefined)
    vi.stubEnv('POSTGRES_URL', undefined)

    expect(() => getDatabaseUrl()).toThrow('DATABASE_URL is not set')
    expect(() => getPostgresUrl()).toThrow('POSTGRES_URL is not set')
  })
})
