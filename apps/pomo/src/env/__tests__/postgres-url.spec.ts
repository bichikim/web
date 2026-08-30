import {describe, expect, it} from 'vitest'

import {postgresUrlSchema} from '../postgres-url'

const schema = postgresUrlSchema('DATABASE_URL')

describe('postgresUrlSchema', () => {
  it.each([
    'postgres://user:password@example.com/pomo?sslmode=require',
    'postgresql://user:password@example.com/pomo?sslmode=require',
  ])('should return a valid Postgres URL', (url) => {
    expect(schema.parse(url)).toBe(url)
  })

  it('should trim a valid URL', () => {
    const url = 'postgresql://user:password@example.com/pomo?sslmode=require'

    expect(schema.parse(` ${url} `)).toBe(url)
  })

  it('should reject a missing URL', () => {
    expect(() => schema.parse('')).toThrow('DATABASE_URL is not set')
  })

  it('should reject a non-Postgres URL', () => {
    expect(() => schema.parse('https://example.com/database')).toThrow(
      'DATABASE_URL must use postgres: or postgresql:',
    )
  })

  it('should reject an invalid URL without echoing its value', () => {
    const invalidUrl = 'not-a-url-with-sensitive-text'

    expect(() => schema.parse(invalidUrl)).toThrow('DATABASE_URL must be a valid URL')

    try {
      schema.parse(invalidUrl)
    } catch (error) {
      expect(String(error)).not.toContain(invalidUrl)
    }
  })
})
