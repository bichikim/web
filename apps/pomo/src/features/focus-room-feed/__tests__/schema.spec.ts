import {expect, it} from 'vitest'

import {feedConnectionSchema, normalizeFeedUrl} from '../schema'

const connection = {
  createdAt: '2026-08-26T00:00:00.000Z',
  id: 'feed',
  updatedAt: '2026-08-26T00:00:00.000Z',
  url: 'https://example.test/feed.xml',
  version: 1,
  voiceId: 'default',
} as const

it('should validate supported feed URLs and voice identifiers', () => {
  expect(feedConnectionSchema.safeParse(connection).success).toBe(true)
  expect(feedConnectionSchema.safeParse({...connection, voiceId: 'Yuna'}).success).toBe(true)
  expect(feedConnectionSchema.safeParse({...connection, voiceId: 'unknown'}).success).toBe(false)
  expect(
    feedConnectionSchema.safeParse({...connection, url: 'ftp://example.test/feed'}).success,
  ).toBe(false)
  expect(feedConnectionSchema.safeParse({...connection, url: 'not a url'}).success).toBe(false)
})

it('should normalize HTTP feed URLs and remove fragments', () => {
  expect(normalizeFeedUrl('  https://example.test/feed.xml#latest  ')).toEqual({
    ok: true,
    value: 'https://example.test/feed.xml',
  })
  expect(normalizeFeedUrl('http://example.test')).toEqual({
    ok: true,
    value: 'http://example.test/',
  })
})

it('should reject empty, oversized, malformed, and unsupported feed URLs', () => {
  expect(normalizeFeedUrl('   ')).toEqual({ok: false})
  expect(normalizeFeedUrl(`https://example.test/${'a'.repeat(2048)}`)).toEqual({ok: false})
  expect(normalizeFeedUrl('mailto:test@example.test')).toEqual({ok: false})
  expect(normalizeFeedUrl('not a url')).toEqual({ok: false})
})
