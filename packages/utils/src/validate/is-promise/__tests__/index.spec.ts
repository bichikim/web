import {isPromise} from '../'

describe('is-promise', () => {
  it('should return true with promise', () => {
    expect(isPromise(Promise.resolve())).toBe(true)
  })
  it('should return false without promise', () => {
    expect(isPromise(null)).toBe(false)
    expect(isPromise(undefined)).toBe(false)
    expect(isPromise({})).toBe(false)
  })
  it('should return true with promise like', () => {
    const promiseLike = {
      catch: jest.fn(),
      then: jest.fn(),
    }
    expect(isPromise(promiseLike)).toBe(true)
  })
  it('should return false without promise like', () => {
    const promiseLike = {
      then: jest.fn(),
    }
    expect(isPromise(promiseLike)).toBe(false)
  })
})
