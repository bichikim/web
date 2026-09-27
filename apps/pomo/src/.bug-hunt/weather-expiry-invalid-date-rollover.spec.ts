/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseWeatherExpiryMs} from '../features/weather/parse-weather-expiry-ms'

it('should reject a non-existent civil date instead of accepting Date.parse rollover', () => {
  expect(parseWeatherExpiryMs('2026-02-30T00:00:00.000Z')).toBeNull()
})
