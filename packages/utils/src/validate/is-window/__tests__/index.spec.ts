/**
 * @jest-environment jsdom
 */

import {isWindow} from '../'

describe('is-window', () => {
  it('should return true with Window', () => {
    expect(isWindow(window)).toBe(true)
    expect(isWindow({})).toBe(false)
  })
})
