import {trimPath} from '../trim-path'

describe('trimPath', () => {
  it('should return trimmed path', () => {
    expect(trimPath('/foo')).toBe('foo')
    expect(trimPath('//foo')).toBe('foo')
    expect(trimPath('//foo/')).toBe('foo')
    expect(trimPath('foo/')).toBe('foo')
    expect(trimPath('foo//')).toBe('foo')
  })
})
