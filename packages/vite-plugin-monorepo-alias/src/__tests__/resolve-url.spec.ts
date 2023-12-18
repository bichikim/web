import {createResolveUrl, resolveUrl} from '../resolve-url'

describe('createResolveUrl', () => {
  it('should return resolveUrl', () => {
    const resolveUrl = createResolveUrl()
    const url = resolveUrl('/foo', '///bar/', 'john')
    expect(url).toBe('foo/bar/john')
  })
  it('should return resolveUrl with a custom separator', () => {
    const resolveUrl = createResolveUrl('~')
    const url = resolveUrl('/foo', '///bar/', 'john')
    expect(url).toBe('foo~bar~john')
  })
})

describe('resolve-url', () => {
  it('should right url', () => {
    const url = resolveUrl('/foo', '///bar/', 'john')
    expect(url).toBe('foo/bar/john')
  })
  it('should resolve', () => {
    const url = resolveUrl('foo///bar', '///bar/', 'john')
    expect(url).toBe('foo/bar/bar/john')
  })
})
