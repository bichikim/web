/**
 * @vitest-environment node
 */
import {isWindow} from '../'
import {describe, expect, it, vi} from 'vitest'
describe('is-window', () => {
  it('should return true with Window', () => {
    expect(isWindow({})).toBe(false)
  })
})
