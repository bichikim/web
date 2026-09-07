import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {LEGACY_WEATHER_LOCATIONS} from '../locations'
import type {WeatherFeedQueryResult} from '../query'
import {resolveWeatherRevalidationSchedule} from '../revalidation'

const NOW = new Date('2026-09-02T09:00:00.000Z')
const locationId = LEGACY_WEATHER_LOCATIONS.seoul.id
const availableResult = {
  feed: {
    current: {
      condition: 'clear',
      humidityPercent: 50,
      precipitationMillimeters: 0,
      temperatureCelsius: 24,
    },
    expiresAt: '2026-09-02T09:05:00.000Z',
    location: LEGACY_WEATHER_LOCATIONS.seoul,
    observedAt: '2026-09-02T08:50:00.000Z',
    schemaVersion: 2,
    source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
    stale: false,
    updatedAt: '2026-09-02T09:00:00.000Z',
  },
  locationId,
  status: 'available',
} satisfies WeatherFeedQueryResult

const resolveSchedule = (
  result: WeatherFeedQueryResult | undefined,
  active = true,
  selectedLocationId = locationId,
) =>
  resolveWeatherRevalidationSchedule({
    active,
    locationId: selectedLocationId,
    result,
  })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('resolveWeatherRevalidationSchedule', () => {
  it('should schedule an available feed after its expiry safety delay', () => {
    expect(resolveSchedule(availableResult)).toEqual({
      kind: 'after-delay',
      milliseconds: 301_000,
    })
  })

  it('should enforce the minimum delay for an already expired feed', () => {
    expect(
      resolveSchedule({
        ...availableResult,
        feed: {...availableResult.feed, expiresAt: '2026-09-02T08:59:00.000Z'},
      }),
    ).toEqual({kind: 'after-delay', milliseconds: 1_000})
  })

  it('should honor Retry-After and use the fallback when it is absent', () => {
    expect(
      resolveSchedule({locationId, retryAfterMilliseconds: 2_000, status: 'collecting'}),
    ).toEqual({kind: 'after-delay', milliseconds: 2_000})
    expect(
      resolveSchedule({locationId, retryAfterMilliseconds: null, status: 'unavailable'}),
    ).toEqual({kind: 'after-delay', milliseconds: 60_000})
  })

  it('should retry normalized request failures at the fallback delay', () => {
    expect(resolveSchedule({locationId, status: 'failed'})).toEqual({
      kind: 'after-delay',
      milliseconds: 60_000,
    })
  })

  it('should not schedule inactive, unresolved, or superseded queries', () => {
    expect(resolveSchedule(availableResult, false)).toBeNull()
    expect(resolveSchedule(undefined)).toBeNull()
    expect(resolveSchedule(availableResult, true, LEGACY_WEATHER_LOCATIONS.busan.id)).toBeNull()
  })
})
