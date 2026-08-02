import {trimPath} from '../trim-path'
import {describe, expect, it} from 'vitest'

describe('trimPath', () => {
  it('should return trimmed path', () => {
    expect(trimPath('/foo')).toBe('foo')
    expect(trimPath('//foo')).toBe('foo')
    expect(trimPath('//foo/')).toBe('foo')
    expect(trimPath('foo/')).toBe('foo')
    expect(trimPath('foo//')).toBe('foo')
  })
})
