/**
 * @vitest-environment jsdom
 */
import {supportsPassiveEvents} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('supportsPassiveEvents errors', () => {
  it('should return true if browser supports passive', () => {
    vi.spyOn(window, 'addEventListener').mockImplementationOnce(() => {
      throw new Error('fake error')
    })
    expect(supportsPassiveEvents()).toBe(false)
  })
})
