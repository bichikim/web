import {join, joinFn} from '../'

describe('join', () => {
  it('should join array', () => {
    expect(join(['foo', 'bar'], '/')).toBe('foo/bar')
  })

  it('should join array with separator', () => {
    expect(join([1, 2, 3], '-')).toBe('1-2-3')
  })
})

describe('joinFn', () => {
  it('should join array', () => {
    expect(joinFn('/')(['foo', 'bar'])).toBe('foo/bar')
  })
})
