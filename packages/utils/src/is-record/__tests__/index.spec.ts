import {isRecord} from '../'

describe('isRecord', () => {
  it('should return ture with a record', () => {
    const result = isRecord({})
    expect(result).toBe(true)
  })
  it('should return false with an array', () => {
    const result = isRecord([])
    expect(result).toBe(false)
  })
})
