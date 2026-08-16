import {describe, expect, it} from 'vitest'

import type {FeedProvider} from '../contract'
import {createFeedRegistry} from '../feed-registry'

const createProvider = (overrides: Partial<FeedProvider['definition']> = {}): FeedProvider => ({
  definition: {
    description: '역사적 순간을 소개합니다.',
    homeUrl: 'https://pomo.example/feeds',
    language: 'ko-KR',
    slug: 'today-in-history',
    title: '오늘의 역사',
    ...overrides,
  },
  listEntries: async () => [],
})

describe('createFeedRegistry', () => {
  it('should resolve registered providers and return undefined for an unknown slug', () => {
    const provider = createProvider()
    const registry = createFeedRegistry([provider])

    expect(registry.getProvider('today-in-history')).toBe(provider)
    expect(registry.getProvider('unknown')).toBeUndefined()
    expect(registry.listProviders()).toEqual([provider])
  })

  it('should reject duplicate slugs', () => {
    expect(() => createFeedRegistry([createProvider(), createProvider()])).toThrow(
      'Duplicate feed slug: today-in-history',
    )
  })

  it.each([
    [{slug: 'Today_In_History'}, 'Invalid feed slug: Today_In_History'],
    [{title: '  '}, 'Feed title must not be empty'],
    [{description: ''}, 'Feed description must not be empty'],
    [{language: '\t'}, 'Feed language must not be empty'],
    [{homeUrl: '/feeds'}, 'Feed homeUrl must be an absolute URL'],
    [{homeUrl: 'ftp://pomo.example/feeds'}, 'Feed homeUrl must use the http or https protocol'],
  ])('should reject an invalid provider definition', (overrides, message) => {
    expect(() => createFeedRegistry([createProvider(overrides)])).toThrow(message)
  })
})
