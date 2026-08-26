import {afterEach, expect, it, vi} from 'vitest'

import {getNextKoreanDate} from '../target-date'

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
})

it('should return the next Korean date across a UTC year boundary', () => {
  expect(getNextKoreanDate(new Date('2026-12-31T14:30:00.000Z'))).toEqual({
    day: 1,
    isoDate: '2027-01-01',
    month: 1,
  })
})

it('should advance from the current Korean calendar day', () => {
  expect(getNextKoreanDate(new Date('2026-08-14T15:30:00.000Z'))).toEqual({
    day: 16,
    isoDate: '2026-08-16',
    month: 8,
  })
})

it('should reject a runtime formatter response without calendar parts', async () => {
  vi.resetModules()
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementationOnce(function createDateTimeFormat() {
    return {
      formatToParts: () => [],
    } as unknown as Intl.DateTimeFormat
  })
  const {getNextKoreanDate: getNextDateWithInvalidFormatter} = await import('../target-date')

  expect(() => getNextDateWithInvalidFormatter(new Date('2026-08-14T15:30:00.000Z'))).toThrow(
    'Failed to calculate the next Korean calendar date',
  )
})
