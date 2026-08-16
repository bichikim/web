import {describe, expect, it} from 'vitest'

import {normalizeFeed} from '../normalize-feed'

const createEntry = (id: string) => ({
  id,
  publishedAt: '2026-08-15T00:00:00.000Z',
  summary: `요약 ${id}`,
  title: `제목 ${id}`,
  url: `https://pomo.example/history/${id}`,
})

describe('normalizeFeed', () => {
  it('should derive the latest content update without mutating entries', () => {
    const entries = [
      createEntry('one'),
      {...createEntry('two'), updatedAt: '2026-08-16T01:02:03.000Z'},
    ]

    expect(normalizeFeed(entries)).toEqual({
      entries,
      updatedAt: '2026-08-16T01:02:03.000Z',
    })
  })

  it('should use a deterministic epoch update for an empty feed', () => {
    expect(normalizeFeed([])).toEqual({entries: [], updatedAt: '1970-01-01T00:00:00.000Z'})
  })

  it('should reject duplicate ids', () => {
    expect(() => normalizeFeed([createEntry('same'), createEntry('same')])).toThrow(
      'Duplicate feed entry id: same',
    )
  })

  it('should reject more than 50 entries', () => {
    const entries = Array.from({length: 51}, (_, index) => createEntry(String(index)))

    expect(() => normalizeFeed(entries)).toThrow()
  })

  it.each([
    {...createEntry('date'), publishedAt: 'not-a-date'},
    {...createEntry('url'), url: '/relative'},
    {...createEntry('protocol'), url: 'ftp://pomo.example/history/protocol'},
    {...createEntry('title'), title: ' '},
  ])('should reject an invalid entry contract', (entry) => {
    expect(() => normalizeFeed([entry])).toThrow()
  })
})
