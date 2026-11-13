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

it.each([
  ['0000-12-31T23:59:59.999Z', {day: 1, isoDate: '0001-01-01', month: 1}],
  ['-000001-01-01T00:00:00.000Z', {day: 2, isoDate: '00-1-01-02', month: 1}],
  ['+010000-01-01T00:00:00.000Z', {day: 2, isoDate: '10000-01-02', month: 1}],
  ['2026-12-31T23:59:59.999+14:00', {day: 1, isoDate: '2027-01-01', month: 1}],
  ['2026-12-31T23:59:59.999-12:00', {day: 2, isoDate: '2027-01-02', month: 1}],
] as const)(
  'should preserve UTC calendar fields and legacy year formatting for %s',
  (instant, expected) => {
    expect(getNextPublicationDate(new Date(instant))).toEqual(expected)
  },
)

it('should leave the supplied Date instant unchanged', () => {
  const now = Object.freeze(new Date('2024-02-28T23:59:59.999Z'))
  const timestamp = now.getTime()

  expect(getNextPublicationDate(now)).toEqual({day: 29, isoDate: '2024-02-29', month: 2})
  expect(now.getTime()).toBe(timestamp)
})

const MAXIMUM_DATE_MILLISECONDS = 8_640_000_000_000_000
const DAY_MILLISECONDS = 86_400_000

it('should preserve the final representable next UTC day', () => {
  expect(getNextPublicationDate(new Date(MAXIMUM_DATE_MILLISECONDS - DAY_MILLISECONDS))).toEqual({
    day: 13,
    isoDate: '275760-09-13',
    month: 9,
  })
})

it.each([MAXIMUM_DATE_MILLISECONDS, MAXIMUM_DATE_MILLISECONDS - 1, Number.NaN])(
  'should preserve the failure contract when the next instant is invalid (%s)',
  (timestamp) => {
    expect(() => getNextPublicationDate(new Date(timestamp))).toThrow(
      new TypeError('Failed to calculate the next UTC calendar date'),
    )
  },
)
