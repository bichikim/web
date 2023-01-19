import {toFormatNumber} from '../'

describe('number-format', () => {
  it('should return currency formatted number', () => {
    const result = toFormatNumber('123456.789')
    expect(result).toBe('123,456.789')
  })
})
