import {expect, it} from 'vitest'

import {getNextKoreanDate} from '../target-date'

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
