import {isWindow} from '../'

import {describe, it, expect} from 'vitest'
describe('is-window', () => {
  it('should return true with Window', () => {
    expect(isWindow(window)).toBe(true)
    expect(isWindow({})).toBe(false)
  })
})
