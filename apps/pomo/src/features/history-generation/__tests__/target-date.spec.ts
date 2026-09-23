/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getNextPublicationDate} from '../target-date'

it('should return the next UTC date across a UTC year boundary', () => {
  expect(getNextPublicationDate(new Date('2026-12-31T14:30:00.000Z'))).toEqual({
    day: 1,
    isoDate: '2027-01-01',
    month: 1,
  })
})

it('should advance from the current UTC calendar day', () => {
  expect(getNextPublicationDate(new Date('2026-08-14T15:30:00.000Z'))).toEqual({
    day: 15,
    isoDate: '2026-08-15',
    month: 8,
  })
})

it('should reject an invalid instant', () => {
  expect(() => getNextPublicationDate(new Date(Number.NaN))).toThrow()
})

it('should include leap day in the next UTC date', () => {
  expect(getNextPublicationDate(new Date('2024-02-28T00:00:00Z'))).toEqual({
    day: 29,
    isoDate: '2024-02-29',
    month: 2,
  })
})
