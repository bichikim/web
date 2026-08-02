import {createTrimPathSeparator, trimPathSeparator} from '../trim-path-separator'
import {describe, expect, it} from 'vitest'

describe('createTrimDupPath', () => {
  it('should return the trimmed path', () => {
    expect(trimPathSeparator('a/b/c/d')).toBe('a/b/c/d')
    expect(trimPathSeparator('a///b/c/d')).toBe('a/b/c/d')
    expect(trimPathSeparator('a///b//c/d')).toBe('a/b/c/d')
    expect(trimPathSeparator('a///b//c/d///')).toBe('a/b/c/d/')
    expect(trimPathSeparator('///a///b//c/d///')).toBe('/a/b/c/d/')
  })
})

describe('createDedupSeparator', () => {
  it('should return trimMidPath', () => {
    const trimMidPath = createTrimPathSeparator('.')

    expect(trimMidPath('a.b.c.d')).toBe('a.b.c.d')
    expect(trimMidPath('a...b.c.d')).toBe('a.b.c.d')
    expect(trimMidPath('a..b..c.d')).toBe('a.b.c.d')
    expect(trimMidPath('a...b.c.d...')).toBe('a.b.c.d.')
    expect(trimMidPath('..a..b..c.d..')).toBe('.a.b.c.d.')
  })
})
