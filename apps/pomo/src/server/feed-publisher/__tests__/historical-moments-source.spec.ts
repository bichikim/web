import {beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => ({conditions})),
  desc: vi.fn((column: unknown) => ({column, direction: 'desc'})),
  eq: vi.fn((left: unknown, right: unknown) => ({left, right})),
  getDatabase: vi.fn(),
  isNotNull: vi.fn((column: unknown) => ({column, operation: 'not-null'})),
}))

vi.mock('drizzle-orm', () => ({
  and: mocks.and,
  desc: mocks.desc,
  eq: mocks.eq,
  isNotNull: mocks.isNotNull,
}))
vi.mock('../../database', () => ({
  feedChannels: {enabled: 'enabled', id: 'channel-id', slug: 'slug'},
  getDatabase: mocks.getDatabase,
  historicalMoments: {
    channelId: 'moment-channel-id',
    contentHtml: 'content-html',
    eventDay: 'event-day',
    eventMonth: 'event-month',
    publishedAt: 'published-at',
    stableKey: 'stable-key',
    status: 'status',
    summary: 'summary',
    title: 'title',
    updatedAt: 'updated-at',
  },
}))

import {historicalMomentsSource} from '../historical-moments-source'

const createDatabase = (rows: ReadonlyArray<unknown>) => {
  const limit = vi.fn(async () => rows)
  const orderBy = vi.fn(() => ({limit}))
  const where = vi.fn(() => ({orderBy}))
  const innerJoin = vi.fn(() => ({where}))
  const from = vi.fn(() => ({innerJoin}))
  const select = vi.fn(() => ({from}))
  return {database: {select}, from, innerJoin, limit, orderBy, select, where}
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should query and serialize published historical moments', async () => {
  const publishedAt = new Date('2026-08-26T01:00:00.000Z')
  const updatedAt = new Date('2026-08-26T02:00:00.000Z')
  const row = {
    contentHtml: '<p>moment</p>',
    publishedAt,
    stableKey: 'moment-key',
    summary: 'summary',
    title: 'title',
    updatedAt,
  }
  const query = createDatabase([row])
  mocks.getDatabase.mockReturnValue(query.database)

  await expect(
    historicalMomentsSource.listPublished({day: 26, limit: 4, month: 8}),
  ).resolves.toEqual([
    {...row, publishedAt: publishedAt.toISOString(), updatedAt: updatedAt.toISOString()},
  ])
  expect(query.limit).toHaveBeenCalledWith(4)
  expect(mocks.eq).toHaveBeenCalledWith('event-month', 8)
  expect(mocks.eq).toHaveBeenCalledWith('event-day', 26)
  expect(mocks.and).toHaveBeenCalledOnce()
  expect(mocks.desc).toHaveBeenCalledWith('published-at')
})

it('should reject invalid database rows', async () => {
  const query = createDatabase([{title: ''}])
  mocks.getDatabase.mockReturnValue(query.database)

  await expect(
    historicalMomentsSource.listPublished({day: 1, limit: 1, month: 1}),
  ).rejects.toThrow()
})
