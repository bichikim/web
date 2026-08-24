import {describe, expect, it} from 'vitest'

import {getKmaServiceKey} from '../environment'

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
