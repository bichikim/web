/**
 * @jest-environment jsdom
 */
import {isSupportPassive} from '../'

describe('isSupportPassive (error)', () => {
  it('should return true if browser supports passive', () => {
    jest.spyOn(window, 'addEventListener').mockImplementationOnce(() => {
      throw new Error('fake error')
    })
    expect(isSupportPassive()).toBe(false)
  })
})
