import {expect, it} from 'vitest'
import {LEGACY_WEATHER_LOCATIONS} from '../../weather'
import {getWeatherLocationDescription} from '../weather-description'

it('should show both languages for Jeju in Korean and only English in English', () => {
  expect(getWeatherLocationDescription(LEGACY_WEATHER_LOCATIONS.jeju, 'ko')).toBe(
    '제주특별자치도 · 대한민국 / Jeju · South Korea',
  )
  expect(getWeatherLocationDescription(LEGACY_WEATHER_LOCATIONS.jeju, 'en')).toBe(
    'Jeju · South Korea',
  )
})

it('should translate every default Korean region to English', () => {
  for (const location of Object.values(LEGACY_WEATHER_LOCATIONS)) {
    const label = getWeatherLocationDescription(location, 'en')
    expect(label).not.toMatch(/[가-힣]/u)
    expect(label).toContain('South Korea')
  }
})

it('should restore missing regions for saved Korean cities without legacy slugs', () => {
  for (const city of Object.values(LEGACY_WEATHER_LOCATIONS)) {
    for (const name of [city.name, city.legacyCitySlug]) {
      const saved = {...city, country: 'KR', legacyCitySlug: undefined, name, region: '  '}
      expect(getWeatherLocationDescription(saved, 'ko')).toBe(
        getWeatherLocationDescription(city, 'ko'),
      )
      expect(getWeatherLocationDescription(saved, 'en')).toBe(
        getWeatherLocationDescription(city, 'en'),
      )
    }
  }
})

it('should use localized city aliases for a missing region and leave foreign names alone', () => {
  const saved = {
    country: '대한민국',
    id: 'openweather:35.4933,128.7489' as const,
    name: 'Miryang-si',
    region: '',
  }
  expect(getWeatherLocationDescription(saved, 'ko')).toBe(
    '경상남도 · 대한민국 / Gyeongsangnam-do · South Korea',
  )
  expect(getWeatherLocationDescription({...saved, country: 'US'}, 'en')).toBe('United States')
  expect(getWeatherLocationDescription({...saved, name: 'Unrecognized city'}, 'en')).toBe(
    'South Korea',
  )
})

it('should handle provider region aliases without confusing foreign regions', () => {
  const location = {
    ...LEGACY_WEATHER_LOCATIONS.miryang,
    country: 'KR',
    legacyCitySlug: undefined,
    region: 'South Gyeongsang',
  }
  expect(getWeatherLocationDescription(location, 'ko')).toBe(
    '경상남도 · 대한민국 / Gyeongsangnam-do · South Korea',
  )
  expect(
    getWeatherLocationDescription({...location, country: 'US', region: 'New York'}, 'ko'),
  ).toBe('New York · 미국 / New York · United States')
})

it('should handle missing regions and previously stored country names', () => {
  expect(
    getWeatherLocationDescription(
      {...LEGACY_WEATHER_LOCATIONS.jeju, country: 'Japan', legacyCitySlug: undefined, region: ''},
      'ko',
    ),
  ).toBe('일본 / Japan')
  expect(
    getWeatherLocationDescription(
      {
        ...LEGACY_WEATHER_LOCATIONS.jeju,
        country: 'Unknown country',
        legacyCitySlug: undefined,
        region: '',
      },
      'en',
    ),
  ).toBe('Unknown country')
})
