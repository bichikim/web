import {describe, expect, it} from 'vitest'
import {getDatabaseUrl, getMigrationDatabaseUrl} from '../environment'

describe('getDatabaseUrl', () => {
  it('should return a valid pooled Postgres URL', () => {
    const url = 'postgresql://user:password@example.com/pomo?sslmode=require'

    expect(getDatabaseUrl({DATABASE_URL: url})).toBe(url)
  })

  it('should trim a valid URL', () => {
    const url = 'postgresql://user:password@example.com/pomo?sslmode=require'

    expect(getDatabaseUrl({DATABASE_URL: ` ${url} `})).toBe(url)
  })

  it('should reject a missing URL', () => {
    expect(() => getDatabaseUrl({})).toThrow('DATABASE_URL is not set')
  })

  it('should reject a non-Postgres URL', () => {
    expect(() => getDatabaseUrl({DATABASE_URL: 'https://example.com/database'})).toThrow(
      'DATABASE_URL must use postgres: or postgresql:',
    )
  })

  it('should reject an invalid URL without echoing its value', () => {
    const invalidUrl = 'not-a-url-with-sensitive-text'

    expect(() => getDatabaseUrl({DATABASE_URL: invalidUrl})).toThrow(
      'DATABASE_URL must be a valid URL',
    )

    try {
      getDatabaseUrl({DATABASE_URL: invalidUrl})
    } catch (error) {
      expect(String(error)).not.toContain(invalidUrl)
    }
  })
})

describe('getMigrationDatabaseUrl', () => {
  it('should prefer the unpooled URL', () => {
    const pooledUrl = 'postgresql://user:password@pooler.example.com/pomo'
    const unpooledUrl = 'postgresql://user:password@example.com/pomo'

    expect(
      getMigrationDatabaseUrl({
        DATABASE_URL: pooledUrl,
        DATABASE_URL_UNPOOLED: unpooledUrl,
      }),
    ).toBe(unpooledUrl)
  })

  it('should fall back to the pooled URL', () => {
    const pooledUrl = 'postgres://user:password@pooler.example.com/pomo'

    expect(getMigrationDatabaseUrl({DATABASE_URL: pooledUrl})).toBe(pooledUrl)
  })

  it('should treat an empty unpooled URL as absent', () => {
    const pooledUrl = 'postgres://user:password@pooler.example.com/pomo'

    expect(
      getMigrationDatabaseUrl({
        DATABASE_URL: pooledUrl,
        DATABASE_URL_UNPOOLED: ' ',
      }),
    ).toBe(pooledUrl)
  })
})
