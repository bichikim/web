import {formatNumber} from '../'
import {describe, expect, it} from 'vitest'

describe('formatNumber', () => {
  it('should return currency formatted number', () => {
    const result = formatNumber('123456.789')

    expect(result).toBe('123,456.789')
  })
})
