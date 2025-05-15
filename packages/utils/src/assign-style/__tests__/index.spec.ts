import {assignStyle} from '../'
import {describe, expect, it} from 'vitest'

describe('resolveStyle', () => {
  it('should resolve style with string and object', () => {
    expect(assignStyle('display: block;', {color: 'red'})).toBe('display: block;color:red;')
  })

  it('should resolve style with object and object', () => {
    expect(assignStyle({display: 'block'}, 'color:red;')).toBe('display:block;color:red;')
  })

  it('should resolve style with string and string', () => {
    expect(assignStyle('display: block;', 'color: red;')).toBe('display: block;color: red;')
  })

  it('should resolve style with object and object', () => {
    expect(assignStyle({display: 'block'}, {color: 'red'})).toBe('display:block;color:red;')
  })

  it('should resolve style with null and object', () => {
    expect(assignStyle(null, {color: 'red'})).toBe('color:red;')
  })

  it('should resolve style with undefined and object', () => {
    expect(assignStyle(undefined, {color: 'red'})).toBe('color:red;')
  })

  it('should resolve style with undefined and null', () => {
    expect(assignStyle(undefined, null)).toBe('')
  })
})
