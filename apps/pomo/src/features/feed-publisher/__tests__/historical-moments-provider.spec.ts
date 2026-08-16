import {describe, expect, it, vi} from 'vitest'

import {
  createHistoricalMomentsProvider,
  type HistoricalMomentSource,
} from '../historical-moments-provider'

describe('createHistoricalMomentsProvider', () => {
  it('should request the Korean calendar date and map stable public entries', async () => {
    const listPublished = vi.fn<HistoricalMomentSource['listPublished']>().mockResolvedValue([
      {
        contentHtml: '<p>광복을 맞았습니다.</p>',
        publishedAt: '2026-08-15T00:00:00.000Z',
        stableKey: '1945 liberation/day',
        summary: '1945년 8월 15일의 역사적 순간입니다.',
        title: '광복을 맞다',
        updatedAt: '2026-08-15T01:00:00.000Z',
      },
    ])
    const provider = createHistoricalMomentsProvider({
      now: () => new Date('2026-08-14T15:30:00.000Z'),
      origin: 'https://preview.pomo.example/some/path',
      source: {listPublished},
    })

    await expect(provider.listEntries()).resolves.toEqual([
      {
        contentHtml: '<p>광복을 맞았습니다.</p>',
        id: 'urn:pomo:historical-moment:1945%20liberation%2Fday',
        publishedAt: '2026-08-15T00:00:00.000Z',
        summary: '1945년 8월 15일의 역사적 순간입니다.',
        title: '광복을 맞다',
        updatedAt: '2026-08-15T01:00:00.000Z',
        url: 'https://preview.pomo.example/feeds/today-in-history#1945%20liberation%2Fday',
      },
    ])
    expect(listPublished).toHaveBeenCalledOnce()
    expect(listPublished).toHaveBeenCalledWith({day: 15, limit: 50, month: 8})
    expect(provider.definition).toMatchObject({
      homeUrl: 'https://preview.pomo.example/feeds',
      language: 'ko-KR',
      slug: 'today-in-history',
    })
  })

  it('should evaluate the current date for every provider read', async () => {
    const listPublished = vi.fn<HistoricalMomentSource['listPublished']>().mockResolvedValue([])
    const dates = [new Date('2026-12-31T14:59:59.000Z'), new Date('2026-12-31T15:00:00.000Z')]
    const provider = createHistoricalMomentsProvider({
      now: () => {
        const date = dates.shift()

        if (date === undefined) {
          throw new Error('Expected a fixture date')
        }

        return date
      },
      origin: 'http://localhost:3000',
      source: {listPublished},
    })

    await provider.listEntries()
    await provider.listEntries()

    expect(listPublished).toHaveBeenNthCalledWith(1, {day: 31, limit: 50, month: 12})
    expect(listPublished).toHaveBeenNthCalledWith(2, {day: 1, limit: 50, month: 1})
  })

  it('should use the system clock when no clock is provided', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-28T15:00:00.000Z'))
    const listPublished = vi.fn<HistoricalMomentSource['listPublished']>().mockResolvedValue([])
    const provider = createHistoricalMomentsProvider({
      origin: 'http://localhost:3000',
      source: {listPublished},
    })

    try {
      await provider.listEntries()
      expect(listPublished).toHaveBeenCalledWith({day: 1, limit: 50, month: 3})
    } finally {
      vi.useRealTimers()
    }
  })
})
