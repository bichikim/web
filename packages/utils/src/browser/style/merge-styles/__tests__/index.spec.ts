import {mergeStyles} from '../'
import {describe, expect, it} from 'vitest'

describe('mergeStyles', () => {
  it('should resolve style with string and object', () => {
    expect(mergeStyles('display: block;', {color: 'red'})).toBe('display: block;color:red;')
  })

  it('should resolve style with object and object', () => {
    expect(mergeStyles({display: 'block'}, 'color:red;')).toBe('display:block;color:red;')
  })

  it('should resolve style with string and string', () => {
    expect(mergeStyles('display: block;', 'color: red;')).toBe('display: block;color: red;')
  })

  it('should insert a delimiter between unterminated style strings', () => {
    expect(mergeStyles('display:block', 'color:red')).toBe('display:block;color:red')
  })

  it('should resolve style with object and object', () => {
    expect(mergeStyles({display: 'block'}, {color: 'red'})).toBe('display:block;color:red;')
  })

  it('should resolve style with null and object', () => {
    expect(mergeStyles(null, {color: 'red'})).toBe('color:red;')
  })

  it('should resolve style with undefined and object', () => {
    expect(mergeStyles(undefined, {color: 'red'})).toBe('color:red;')
  })

  it('should resolve style with undefined and null', () => {
    expect(mergeStyles(undefined, null)).toBe('')
  })
})
