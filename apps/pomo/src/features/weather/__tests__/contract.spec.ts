import {expect, it} from 'vitest'

import {
  parseWeatherCitySlug,
  parseWeatherFeed,
  parseWeatherLocation,
  parseWeatherLocationId,
} from '../contract'

const FEED = {
  current: {
    condition: 'clear',
    humidityPercent: 50,
    precipitationMillimeters: null,
    temperatureCelsius: 24,
  },
  expiresAt: '2026-08-26T03:00:00.000Z',
  location: {
    country: '대한민국',
    id: 'openweather:legacy:seoul',
    legacyCitySlug: 'seoul',
    name: '서울',
    region: '서울특별시',
  },
  observedAt: '2026-08-26T01:00:00.000Z',
  schemaVersion: 2,
  source: {
    name: 'OpenWeather',
    url: 'https://openweathermap.org/',
  },
  stale: false,
  updatedAt: '2026-08-26T01:01:00.000Z',
}

it('should parse the public weather feed contract', () => {
  expect(parseWeatherFeed(FEED)).toEqual(FEED)
  expect(() => parseWeatherFeed({...FEED, schemaVersion: 1})).toThrow()
})

it('should parse only registered provider location identifiers', () => {
  expect(parseWeatherLocation(FEED.location)).toEqual(FEED.location)
  expect(parseWeatherLocationId('openweather:51.5200,-0.1100')).toBe('openweather:51.5200,-0.1100')
  expect(() => parseWeatherLocationId('openweather:tokyo')).toThrow()
})

it('should parse only supported weather city slugs', () => {
  expect(parseWeatherCitySlug('jeju')).toBe('jeju')
  expect(() => parseWeatherCitySlug('tokyo')).toThrow()
})
