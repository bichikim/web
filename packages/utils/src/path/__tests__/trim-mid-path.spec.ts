import {createTrimDedupPath, trimDedupPath} from 'src/path/trim-dedup-path'

describe('trimMidPath', () => {
  it('should return the trimmed path', () => {
    expect(trimDedupPath('a/b/c/d')).toBe('a/b/c/d')
    expect(trimDedupPath('a///b/c/d')).toBe('a/b/c/d')
    expect(trimDedupPath('a///b//c/d')).toBe('a/b/c/d')
    expect(trimDedupPath('a///b//c/d///')).toBe('a/b/c/d/')
    expect(trimDedupPath('///a///b//c/d///')).toBe('/a/b/c/d/')
  })
})

describe('createTrimMidPath', () => {
  it('should return trimMidPath', () => {
    const trimMidPath = createTrimDedupPath('.')
    expect(trimMidPath('a.b.c.d')).toBe('a.b.c.d')
    expect(trimMidPath('a...b.c.d')).toBe('a.b.c.d')
    expect(trimMidPath('a..b..c.d')).toBe('a.b.c.d')
    expect(trimMidPath('a...b.c.d...')).toBe('a.b.c.d.')
    expect(trimMidPath('..a..b..c.d..')).toBe('.a.b.c.d.')
  })
})
