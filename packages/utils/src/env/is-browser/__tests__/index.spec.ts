import {isBrowser} from '../'

describe('isBrowse', () => {
  it('should return true', () => {
    // for testing
    // @ts-ignore
    globalThis.window = {}
    expect(isBrowser()).toBe(true)
    // for testing
    // @ts-ignore
    globalThis.window = undefined
  })
  it('should return false', () => {
    expect(isBrowser()).toBe(false)
  })
})
