/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createCurrentWeather} from '../create-current-weather'

it('should map stored observation fields onto the current weather payload', () => {
  expect(
    createCurrentWeather({
      humidityPercent: 50,
      precipitation: 'rain',
      precipitationMillimeters: 3,
      sky: 'clear',
      temperatureCelsius: 24,
    }),
  ).toEqual({
    condition: 'rain',
    humidityPercent: 50,
    precipitationMillimeters: 3,
    temperatureCelsius: 24,
  })
})

it('should resolve sky when precipitation is none', () => {
  expect(
    createCurrentWeather({
      humidityPercent: null,
      precipitation: 'none',
      precipitationMillimeters: null,
      sky: 'cloudy',
      temperatureCelsius: null,
    }),
  ).toEqual({
    condition: 'cloudy',
    humidityPercent: null,
    precipitationMillimeters: null,
    temperatureCelsius: null,
  })
})
