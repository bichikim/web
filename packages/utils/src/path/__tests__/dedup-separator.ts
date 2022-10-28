import {createDedupSeparator, dedupSeparator} from 'src/path/depub-separator'

describe('createTrimDupPath', () => {
  it('should return the trimmed path', () => {
    expect(dedupSeparator('a/b/c/d')).toBe('a/b/c/d')
    expect(dedupSeparator('a///b/c/d')).toBe('a/b/c/d')
    expect(dedupSeparator('a///b//c/d')).toBe('a/b/c/d')
    expect(dedupSeparator('a///b//c/d///')).toBe('a/b/c/d/')
    expect(dedupSeparator('///a///b//c/d///')).toBe('/a/b/c/d/')
  })
})

describe('createDedupSeparator', () => {
  it('should return trimMidPath', () => {
    const trimMidPath = createDedupSeparator('.')
    expect(trimMidPath('a.b.c.d')).toBe('a.b.c.d')
    expect(trimMidPath('a...b.c.d')).toBe('a.b.c.d')
    expect(trimMidPath('a..b..c.d')).toBe('a.b.c.d')
    expect(trimMidPath('a...b.c.d...')).toBe('a.b.c.d.')
    expect(trimMidPath('..a..b..c.d..')).toBe('.a.b.c.d.')
  })
})
