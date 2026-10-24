import {expect, it} from 'vitest'
import {parseWeatherExpiryMs} from '../parse-weather-expiry-ms'
it.each(['', 'invalid', '9999999999999999'])('should reject non-finite expiry %s', (value) => {
  expect(parseWeatherExpiryMs(value)).toBeNull()
})
it.each([
  '2026-02-30T00:00:00.000Z',
  '2026-04-31T00:00:00.000Z',
  '2026-02-29T00:00:00.000Z',
  '1900-02-29T00:00:00.000Z',
])('should reject impossible calendar date %s', (value) => {
  expect(parseWeatherExpiryMs(value)).toBeNull()
})
it.each(['2024-02-29T00:00:00.000Z', '2000-02-29T00:00:00.000Z'])(
  'should accept valid leap day %s',
  (value) => {
    expect(parseWeatherExpiryMs(value)).toBe(Date.parse(value))
  },
)
it('should preserve epoch zero and timezone offsets', () => {
  expect(parseWeatherExpiryMs('1970-01-01T00:00:00Z')).toBe(0)
  expect(parseWeatherExpiryMs('1970-01-01T09:00:00+09:00')).toBe(0)
})
