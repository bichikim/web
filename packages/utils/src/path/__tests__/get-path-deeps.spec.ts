import {getPathDeeps} from '../get-path-deeps'

describe('getPathDeeps', () => {
  it('should return count of deeps', () => {
    expect(getPathDeeps('john')).toBe(0)
    expect(getPathDeeps('john/foo')).toBe(1)
    expect(getPathDeeps('foo/bar/john')).toBe(2)
    expect(getPathDeeps('/foo/bar/john/')).toBe(2)
    expect(getPathDeeps('foo/bar/john/')).toBe(2)
    expect(getPathDeeps('foo/bar/john///')).toBe(2)
    expect(getPathDeeps('foo//bar/john///')).toBe(2)
  })
})
