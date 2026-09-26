import {expect, it} from 'vitest'
import {parseWeatherExpiryMs} from '../parse-weather-expiry-ms'
it.each(['', 'invalid', '9999999999999999'])('should reject non-finite expiry %s', (value) => {
  expect(parseWeatherExpiryMs(value)).toBeNull()
})
it('should preserve epoch zero and timezone offsets', () => {
  expect(parseWeatherExpiryMs('1970-01-01T00:00:00Z')).toBe(0)
  expect(parseWeatherExpiryMs('1970-01-01T09:00:00+09:00')).toBe(0)
})
