/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseWeatherExpiryMs} from 'src/features/weather/parse-weather-expiry-ms'

it('should reject persisted expiry timestamps with an overflow hour', () => {
  expect(parseWeatherExpiryMs('2026-08-14T24:00:00.000Z')).toBeNull()
})
