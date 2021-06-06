import {isPromise} from '../'

describe('is-promise', () => {
  it('should be promise', () => {
    const result = isPromise(Promise.resolve())

    expect(result).toBe(true)
  })

  it('should not be promise', () => {
    const result = isPromise(false)

    expect(result).toBe(false)
  })
})
