import {getRelativePath} from '../get-relative-path'
import {describe, expect, it} from 'vitest'

describe('getRelativePath', () => {
  const roots = [/^foo\/bar\//u, /^joo\/zar\//u]

  it('should return relative path', () => {
    expect(getRelativePath(roots, 'foo/bar/john')).toBe('john')
    expect(getRelativePath(roots, 'joo/zar/john')).toBe('john')
    expect(getRelativePath(roots, 'joo/john')).toBe('')
  })
})
