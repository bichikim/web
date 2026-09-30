import {describe, expect, it} from 'vitest'

import {parseWeatherExpiryMs} from '../features/weather/parse-weather-expiry-ms'

describe('parseWeatherExpiryMs hour 24 rollover', () => {
  it('should reject persisted expiry timestamps that use hour 24 on the stated calendar day', () => {
    const malformedExpiry = '2026-09-04T24:00:00.000Z'

    expect(parseWeatherExpiryMs(malformedExpiry)).toBeNull()
    expect(parseWeatherExpiryMs(malformedExpiry)).not.toBe(Date.parse('2026-09-05T00:00:00.000Z'))
  })
})
