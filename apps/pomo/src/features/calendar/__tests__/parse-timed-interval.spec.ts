/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseTimedInterval} from '../parse-timed-interval'

it.each([
  [' 2026-09-05T09:00:00+09:00', '2026-09-05T10:00:00+09:00'],
  ['2026-09-05T00:00:00Z', '2026-09-05T01:00:00Z '],
  ['\t2026-09-05T00:00:00Z\n', '\n2026-09-05T01:00:00Z\t'],
])('should trim surrounding whitespace from %s through %s', (start, end) => {
  expect(parseTimedInterval(start, end)).toEqual({
    end: Date.parse('2026-09-05T01:00:00Z'),
    start: Date.parse('2026-09-05T00:00:00Z'),
  })
})

it.each([
  [' 2026-02-30T00:00:00Z ', '2026-03-01T01:00:00Z'],
  ['2026-09-05T00:00:00Z', ' 2026-13-05T01:00:00Z '],
  [' 2026-09-05 T00:00:00Z ', '2026-09-05T01:00:00Z'],
  [' 2026-09-05T00:00:00 ', '2026-09-05T01:00:00Z'],
  [' 2026-09-05T24:00:00Z ', '2026-09-06T01:00:00Z'],
  ['   ', '2026-09-05T01:00:00Z'],
  ['2026-09-05T00:00:00Z', '   '],
  [' 2026-09-05T01:00:00Z ', ' 2026-09-05T00:00:00Z '],
  [' 2026-09-05T01:00:00+09:00 ', ' 2026-09-04T16:00:00Z '],
])('should reject an invalid or non-increasing trimmed interval: %s through %s', (start, end) => {
  expect(parseTimedInterval(start, end)).toBeNull()
})
