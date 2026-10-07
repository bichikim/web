/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import type {ParsedFeedItem} from '../feed-parser'
import {planFeedSync} from '../plan-sync'

const now = new Date('2026-08-14T12:00:00.000Z')
const subscriptionCreatedAt = '2026-08-14T00:00:00.000Z'
const item = (id: string, publishedAt: string | null, legacyId?: string): ParsedFeedItem => ({
  content: 'Full article',
  contentKind: 'full',
  id,
  ...(legacyId === undefined ? {} : {legacyId}),
  link: `https://example.com/${id}`,
  publishedAt,
  title: id,
})
const plan = (items: ReadonlyArray<ParsedFeedItem>, storedItemIds: ReadonlyArray<string> = []) =>
  planFeedSync({items, now, storedItemIds, subscriptionCreatedAt})

it('should consume legacy matches in feed order before sorting, including stored current IDs', () => {
  const current = item('current', '2026-08-14T03:00:00.000Z', 'legacy')
  const sibling = item('sibling', '2026-08-14T02:00:00.000Z', 'legacy')
  expect(plan([current, sibling], ['current', 'legacy']).itemsToProcess).toEqual([sibling])
  expect(plan([current, sibling], ['legacy']).itemsToProcess).toEqual([sibling])
  expect(plan([sibling, current], ['legacy']).itemsToProcess).toEqual([current])
})

it('should choose the newest twenty unseen items and process them oldest first without mutating input', () => {
  const items = Object.freeze(
    Array.from({length: 22}, (_, index) =>
      Object.freeze(item(`item-${index}`, new Date(now.getTime() - index * 60_000).toISOString())),
    ),
  )
  const snapshot = structuredClone(items)
  const result = plan(items, ['item-0'])
  expect(result.itemsToProcess.map((entry) => entry.id)).toEqual(
    Array.from({length: 20}, (_, index) => `item-${20 - index}`),
  )
  expect(result.ignoredItems).toEqual([])
  expect(items).toEqual(snapshot)
  expect(result.itemsToProcess[0]).toBe(items[20])
})

it('should preserve the exact age and subscription boundaries and stale reason precedence', () => {
  const stale = item('stale', '2026-08-11T11:59:59.999Z')
  const boundary = item('age-boundary', '2026-08-11T12:00:00.000Z')
  const historical = item('historical', '2026-08-13T23:59:59.999Z')
  const subscribed = item('subscription-boundary', subscriptionCreatedAt)
  const result = plan([subscribed, historical, boundary, stale], ['previous'])
  expect(result.itemsToProcess).toEqual([subscribed])
  expect(result.ignoredItems).toEqual([
    {item: stale, reason: 'stale'},
    {item: boundary, reason: 'historical'},
    {item: historical, reason: 'historical'},
  ])
  expect(
    planFeedSync({
      items: [boundary],
      now,
      storedItemIds: [],
      subscriptionCreatedAt: boundary.publishedAt!,
    }),
  ).toEqual({ignoredItems: [], itemsToProcess: [boundary]})
})

it('should take the original first undated fallback even when it falls outside the capped unseen set', () => {
  const undated = item('first-undated', null)
  const dated = Array.from({length: 21}, (_, index) =>
    item(
      `dated-${index}`,
      new Date(Date.parse(subscriptionCreatedAt) - (index + 1) * 60_000).toISOString(),
    ),
  )
  const result = plan([undated, ...dated, item('second-undated', null)])
  expect(result.itemsToProcess).toEqual([undated])
  expect(result.ignoredItems).toHaveLength(20)
  expect(result.ignoredItems.every((entry) => entry.reason === 'historical')).toBe(true)
  expect(result.ignoredItems.map((entry) => entry.item.id)).toEqual(
    Array.from({length: 20}, (_, index) => `dated-${19 - index}`),
  )
})

it('should suppress first-sync undated fallback when dated current items exist and allow later undated items', () => {
  const undated = item('undated', null)
  const current = item('current', subscriptionCreatedAt)
  expect(plan([undated, current])).toEqual({
    ignoredItems: [{item: undated, reason: 'historical'}],
    itemsToProcess: [current],
  })
  expect(plan([undated, current], ['previous'])).toEqual({
    ignoredItems: [],
    itemsToProcess: [undated, current],
  })
})

it('should apply stale and historical exclusions to all matching IDs', () => {
  const stale = item('duplicate', '2026-08-10T00:00:00.000Z')
  const current = item('duplicate', subscriptionCreatedAt)
  expect(plan([current, stale], ['previous']).ignoredItems).toEqual([
    {item: stale, reason: 'stale'},
    {item: current, reason: 'stale'},
  ])
  const historical = item('duplicate', '2026-08-13T23:00:00.000Z')
  expect(plan([current, historical], ['previous'])).toEqual({
    ignoredItems: [
      {item: historical, reason: 'historical'},
      {item: current, reason: 'historical'},
    ],
    itemsToProcess: [],
  })
})

it('should return an empty plan for stored items without reading the clock', () => {
  const current = item('stored', subscriptionCreatedAt)
  const invalidNow = new Date(Number.NaN)
  const readClock = vi.spyOn(invalidNow, 'getTime')
  expect(
    planFeedSync({
      items: [current],
      now: invalidNow,
      storedItemIds: ['stored'],
      subscriptionCreatedAt,
    }),
  ).toEqual({
    ignoredItems: [],
    itemsToProcess: [],
  })
  expect(readClock).not.toHaveBeenCalled()
})
