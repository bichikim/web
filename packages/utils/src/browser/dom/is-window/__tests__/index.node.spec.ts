/**
 * @vitest-environment node
 */
import {describe, expect, it} from 'vitest'
import {isWindow} from '../'

describe('is-window', () => {
  it('should return true with Window', () => {
    expect(isWindow({})).toBe(false)
  })
})
