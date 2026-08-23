import {expect, it} from 'vitest'

import {
  getKmaObservationTime,
  getKmaSkyTime,
  getLatestKmaAvailabilityTime,
  getSecondsUntilNextKmaAvailability,
  parseKmaDateTime,
} from '../kma-time'

it('should use the previous KMA issue hour before each availability minute', () => {
  expect(getKmaObservationTime(new Date('2026-08-22T00:05:00.000Z'))).toEqual({
    date: '20260822',
    time: '0800',
  })
})

it('should cross the Korea-local date boundary without using the server timezone', () => {
  expect(getKmaObservationTime(new Date('2026-08-21T15:50:00.000Z'))).toEqual({
    date: '20260822',
    time: '0000',
  })
})

it('should parse a Korea-local KMA timestamp as an absolute instant', () => {
  expect(parseKmaDateTime('20260822', '0200').toISOString()).toBe('2026-08-21T17:00:00.000Z')
})

it('should use the latest available sky issue time without exposing it to storage', () => {
  expect(getKmaSkyTime(new Date('2026-08-22T05:50:00.000Z'))).toEqual({
    date: '20260822',
    time: '1430',
  })
  expect(getKmaSkyTime(new Date('2026-08-21T15:50:00.000Z'))).toEqual({
    date: '20260822',
    time: '0030',
  })
  expect(getKmaSkyTime(new Date('2026-08-22T05:44:59.000Z'))).toEqual({
    date: '20260822',
    time: '1330',
  })
})

it.each([
  ['2026-08-22T00:09:30.000Z', 30],
  ['2026-08-22T00:10:00.000Z', 2_100],
  ['2026-08-22T00:44:30.000Z', 30],
  ['2026-08-22T00:45:00.000Z', 1_500],
] as const)('should expire caches at the next KMA availability boundary', (now, seconds) => {
  expect(getSecondsUntilNextKmaAvailability(new Date(now))).toBe(seconds)
})

it.each([
  ['2026-08-22T00:09:59.000Z', '2026-08-21T23:45:00.000Z'],
  ['2026-08-22T00:10:00.000Z', '2026-08-22T00:10:00.000Z'],
  ['2026-08-22T00:44:59.000Z', '2026-08-22T00:10:00.000Z'],
  ['2026-08-22T00:45:00.000Z', '2026-08-22T00:45:00.000Z'],
] as const)('should resolve the latest complete weather availability boundary', (now, boundary) => {
  expect(getLatestKmaAvailabilityTime(new Date(now)).toISOString()).toBe(boundary)
})
