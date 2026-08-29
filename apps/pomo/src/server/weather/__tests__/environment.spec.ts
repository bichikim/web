import {describe, expect, it} from 'vitest'

import {getKmaServiceKey, getOpenWeatherApiKey} from '../environment'

describe('getKmaServiceKey', () => {
  it('should return a trimmed service key', () => {
    expect(getKmaServiceKey({KMA_SERVICE_KEY: ' decoded-service-key '})).toBe('decoded-service-key')
  })

  it.each([undefined, '', '  '])('should reject a missing service key', (serviceKey) => {
    expect(() => getKmaServiceKey({KMA_SERVICE_KEY: serviceKey})).toThrow(
      'KMA_SERVICE_KEY is not set',
    )
  })
})

describe('getOpenWeatherApiKey', () => {
  it('should return a trimmed API key', () => {
    expect(getOpenWeatherApiKey({OPENWEATHER_API_KEY: ' openweather-key '})).toBe('openweather-key')
  })

  it.each([undefined, '', '  '])('should reject a missing API key', (apiKey) => {
    expect(() => getOpenWeatherApiKey({OPENWEATHER_API_KEY: apiKey})).toThrow(
      'OPENWEATHER_API_KEY is not set',
    )
  })
})
