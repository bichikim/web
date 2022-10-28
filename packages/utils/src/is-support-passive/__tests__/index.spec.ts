import {isSupportPassive} from '../'

describe('isSupportPassive', () => {
  it('should return true if browser supports passive', () => {
    expect(isSupportPassive()).toBe(true)
  })
})
