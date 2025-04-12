/**
 * @jest-environment jsdom
 */
import {isSupportPassive} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('isSupportPassive (error)', () => {
  it('should return true if browser supports passive', () => {
    vi.spyOn(window, 'addEventListener').mockImplementationOnce(() => {
      throw new Error('fake error')
    })
    expect(isSupportPassive()).toBe(false)
  })
})
