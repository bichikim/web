import {join, joinOp} from '../'
import {describe, it, expect} from 'vitest'
describe('join', () => {
  it('should join array', () => {
    expect(join(['foo', 'bar'], '/')).toBe('foo/bar')
  })

  it('should join array with separator', () => {
    expect(join([1, 2, 3], '-')).toBe('1-2-3')
  })
})

describe('joinOp', () => {
  it('should join array (curry)', () => {
    expect(joinOp('/')(['foo', 'bar'])).toBe('foo/bar')
  })
  it('should join array (curry)', () => {
    expect(joinOp('/', ['foo', 'bar'])).toBe('foo/bar')
  })
})
