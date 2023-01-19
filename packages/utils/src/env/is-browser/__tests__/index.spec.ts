import {isBrowser} from '../'

describe('isBrowse', () => {
  it('should return true', () => {
    // for testing
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.window = {}
    expect(isBrowser()).toBe(true)
    globalThis.window = undefined
  })
  it('should return false', () => {
    expect(isBrowser()).toBe(false)
  })
})
