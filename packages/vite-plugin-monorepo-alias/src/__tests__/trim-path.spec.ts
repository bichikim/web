import {createTrimPath, trimPath} from '../trim-path'

describe('trimPath', () => {
  it('should return trimmed path with both', () => {
    expect(trimPath('/foo')).toBe('foo')
    expect(trimPath('//foo')).toBe('foo')
    expect(trimPath('//foo/')).toBe('foo')
    expect(trimPath('foo/')).toBe('foo')
    expect(trimPath('foo//')).toBe('foo')
  })
  it('should return trimmed path with left', () => {
    const trimPath = createTrimPath('/', 1000, 'left')

    expect(trimPath('/foo')).toBe('foo')
    expect(trimPath('//foo')).toBe('foo')
    expect(trimPath('//foo/')).toBe('foo/')
    expect(trimPath('foo/')).toBe('foo/')
    expect(trimPath('foo//')).toBe('foo//')
  })
  it('should return trimmed path with right', () => {
    const trimPath = createTrimPath('/', 1000, 'right')

    expect(trimPath('/foo')).toBe('/foo')
    expect(trimPath('//foo')).toBe('//foo')
    expect(trimPath('//foo/')).toBe('//foo')
    expect(trimPath('foo/')).toBe('foo')
    expect(trimPath('foo//')).toBe('foo')
  })
})
