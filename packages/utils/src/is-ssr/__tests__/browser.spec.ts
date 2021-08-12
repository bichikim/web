import {isSSR} from '../'

describe('isSSR in browser', () => {
  it('should be false', () => {
    const result = isSSR()
    expect(result).toBe(false)
  })
})
