import {formatNumber} from '../'

describe('number-format', () => {
  it('should return currency formatted number', () => {
    const result = formatNumber('123456.789')
    expect(result).toBe('123,456.789')
  })
})
