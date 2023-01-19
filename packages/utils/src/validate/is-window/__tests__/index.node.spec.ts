import {isWindow} from '../'

describe('is-window', () => {
  it('should return true with Window', () => {
    expect(isWindow({})).toBe(false)
  })
})
