import {isListenable} from '../'

describe('isListenable', () => {
  it('should return true', () => {
    const result = isListenable()
    expect(result).toBe(true)
  })
})

