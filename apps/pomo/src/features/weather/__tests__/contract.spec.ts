import {expect, it} from 'vitest'

import {parseWeatherCitySlug, parseWeatherFeed} from '../contract'

const FEED = {
  city: {label: '서울', slug: 'seoul'},
  current: {
    condition: 'clear',
    humidityPercent: 50,
    precipitationMillimeters: null,
    temperatureCelsius: 24,
  },
  expiresAt: '2026-08-26T03:00:00.000Z',
  observedAt: '2026-08-26T01:00:00.000Z',
  schemaVersion: 1,
  source: {
    name: '기상청',
    url: 'https://www.data.go.kr/data/15084084/openapi.do',
  },
  stale: false,
  updatedAt: '2026-08-26T01:01:00.000Z',
}

it('should parse the public weather feed contract', () => {
  expect(parseWeatherFeed(FEED)).toEqual(FEED)
  expect(() => parseWeatherFeed({...FEED, schemaVersion: 2})).toThrow()
})

it('should parse only supported weather city slugs', () => {
  expect(parseWeatherCitySlug('jeju')).toBe('jeju')
  expect(() => parseWeatherCitySlug('tokyo')).toThrow()
})
