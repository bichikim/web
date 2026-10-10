/** @vitest-environment node */
import {expect, it} from 'vitest'

import type {ParsedFeedItem} from '../features/focus-room-feed/feed-parser'
import {planFeedSync} from '../features/focus-room-feed/plan-sync'

const now = new Date('2026-08-14T12:00:00.000Z')
const subscriptionCreatedAt = '2026-08-14T00:00:00.000Z'

const item = (id: string, publishedAt: string, title: string): ParsedFeedItem => ({
  content: 'Full article',
  contentKind: 'full',
  id,
  link: `https://example.com/${id}`,
  publishedAt,
  title,
})

it('should process a repeated feed item id only once per sync plan', () => {
  const duplicateId = 'shared-guid'
  const first = item(duplicateId, subscriptionCreatedAt, 'First copy')
  const second = item(duplicateId, subscriptionCreatedAt, 'Second copy')
  const result = planFeedSync({
    items: [first, second],
    now,
    storedItemIds: ['previous'],
    subscriptionCreatedAt,
  })

  expect(result.itemsToProcess.map((entry) => entry.id)).toEqual([duplicateId])
})
