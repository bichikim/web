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

it('should classify the first same-ID item and ignore conflicting later timestamps', () => {
  const stale = item('duplicate', '2026-08-10T00:00:00.000Z')
  const current = item('duplicate', subscriptionCreatedAt)
  const historical = item('duplicate', '2026-08-13T23:00:00.000Z')
  expect(plan([current, stale], ['previous'])).toEqual({
    ignoredItems: [],
    itemsToProcess: [current],
  })
  expect(plan([stale, current], ['previous'])).toEqual({
    ignoredItems: [{item: stale, reason: 'stale'}],
    itemsToProcess: [],
  })
  expect(plan([historical, current], ['previous'])).toEqual({
    ignoredItems: [{item: historical, reason: 'historical'}],
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

it('should process identical selected items once, including separately parsed objects', () => {
  const current = item('duplicate', subscriptionCreatedAt)
  expect(plan([current, {...current}], ['previous'])).toEqual({
    ignoredItems: [],
    itemsToProcess: [current],
  })
})

it('should deduplicate before selecting the newest twenty items', () => {
  const current = item('duplicate', subscriptionCreatedAt)
  const older = item('older', subscriptionCreatedAt)
  const copies = Array.from({length: 20}, () => ({...current}))
  expect(plan([older, ...copies], ['previous']).itemsToProcess).toEqual([older, current])
})

it('should not reprocess an identical entry when its legacy ID is already stored', () => {
  const current = item('duplicate', subscriptionCreatedAt, 'legacy')
  expect(plan([current, {...current}], ['legacy']).itemsToProcess).toEqual([])
})

it('should preserve the first undated fallback and deduplicate later undated copies', () => {
  const undated = item('undated', null)
  const historical = Array.from({length: 21}, (_, index) =>
    item(`historical-${index}`, '2026-08-13T23:00:00.000Z'),
  )
  const first = plan([undated, {...undated}, ...historical])
  expect(first.itemsToProcess).toEqual([undated])
  expect(first.ignoredItems).toHaveLength(20)
  expect(first.ignoredItems.every((entry) => entry.reason === 'historical')).toBe(true)
  expect(plan([undated, {...undated}], ['previous'])).toEqual({
    ignoredItems: [],
    itemsToProcess: [undated],
  })
})

it('should process an overflow undated item on the next sync without recording it as ignored', () => {
  const undated = item('undated', null)
  const dated = Array.from({length: 20}, (_, index) =>
    item(`dated-${index}`, subscriptionCreatedAt),
  )
  const first = plan([undated, ...dated], ['stored'])
  expect(first).toEqual({deferredItems: [undated], ignoredItems: [], itemsToProcess: dated})
  expect(plan([undated, ...dated], ['stored', ...dated.map(({id}) => id)])).toEqual({
    ignoredItems: [],
    itemsToProcess: [undated],
  })
})

it('should keep the first same-ID item before sorting and count it once toward the cap', () => {
  const first = item('duplicate', subscriptionCreatedAt)
  const changed = {...first, content: 'Changed body', publishedAt: '2026-08-14T01:00:00.000Z'}
  const others = Array.from({length: 19}, (_, index) =>
    item(`other-${index}`, subscriptionCreatedAt),
  )
  expect(plan([first, ...others, changed], ['previous'])).toEqual({
    ignoredItems: [],
    itemsToProcess: [first, ...others],
  })
})

it('should keep only the first same-ID payload across repeated rows', () => {
  const current = item('duplicate', subscriptionCreatedAt)
  const changed = {...current, content: 'Changed body'}
  expect(plan([current, changed, {...current}, {...changed}], ['previous'])).toEqual({
    ignoredItems: [],
    itemsToProcess: [current],
  })
})
