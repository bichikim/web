import {expect, it} from 'vitest'

import {WEATHER_CITY_SLUGS} from 'src/features/weather'
import {getWeatherLocation} from '../locations'

it('should return the configured grid location for every supported city', () => {
  expect(getWeatherLocation('seoul')).toEqual({
    gridX: 60,
    gridY: 127,
    label: '서울',
    slug: 'seoul',
  })
  expect(getWeatherLocation('jeju')).toEqual({
    gridX: 52,
    gridY: 38,
    label: '제주',
    slug: 'jeju',
  })
  expect(WEATHER_CITY_SLUGS).toContain('miryang')
  expect(getWeatherLocation('miryang')).toEqual({
    gridX: 92,
    gridY: 83,
    label: '밀양',
    slug: 'miryang',
  })
})
