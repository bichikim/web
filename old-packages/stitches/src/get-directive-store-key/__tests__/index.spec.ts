import {getDirectiveStoreKey} from '../'

describe('getDirectiveStoreKey', () => {
  it('should return the directive store key', () => {
    expect(getDirectiveStoreKey({arg: 'foo'} as any)).toBe('__stitches__foo')
  })
  it('should return the directive store key', () => {
    expect(getDirectiveStoreKey({} as any)).toBe('__stitches__')
  })
  it('should return the directive store key', () => {
    expect(getDirectiveStoreKey({} as any, '__foo__')).toBe('__foo__')
  })
})
