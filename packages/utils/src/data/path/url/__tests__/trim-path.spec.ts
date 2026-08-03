import {createTrimPath, trimPath} from '../trim-path'
import {describe, expect, it} from 'vitest'

describe('trimPath', () => {
  it('should return trimmed path', () => {
    expect(trimPath('/foo')).toBe('foo')
    expect(trimPath('//foo')).toBe('foo')
    expect(trimPath('//foo/')).toBe('foo')
    expect(trimPath('foo/')).toBe('foo')
    expect(trimPath('foo//')).toBe('foo')
  })

  it('should treat a regular expression metacharacter as a literal separator', () => {
    const trimBracket = createTrimPath(']')

    expect(trimBracket(']]]foo]]]')).toBe('foo')
  })

  it('should reject an empty separator', () => {
    expect(() => createTrimPath('')).toThrow(RangeError)
  })
})
