import {isNode, isSSR} from '../'

describe('isNode', () => {
  it('should return true with node env', () => {
    expect(isNode()).toBe(true)
  })
  it('should return true with browser (having window)', () => {
    // for testing
    // @ts-ignore
    globalThis.window = {}
    expect(isNode()).toBe(false)
    // for testing
    // @ts-ignore
    globalThis.window = undefined
  })
})

describe('isSSR', () => {
  it('should be same with isNode', () => {
    expect(isSSR).toBe(isNode)
  })
})
