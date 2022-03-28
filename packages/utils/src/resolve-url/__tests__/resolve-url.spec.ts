import {chunkUrl, resolveQuery, resolveUrl} from '../'

describe('resolve-url', () => {
  it('should right url', () => {
    const url = resolveUrl('/foo', '///bar/', 'john')
    expect(url).toBe('foo/bar/john')
  })
  it('should right url with protocol & host', () => {
    const url = resolveUrl('https://foo.com//', '///bar/', 'john')
    expect(url).toBe('https://foo.com/bar/john')
  })
})

describe('resolveQuery', () => {
  it('should with protocol, host and url', () => {
    const result = chunkUrl('https://foo.com/bar/john')
    expect(result).toEqual({
      chunkedUrl: ['bar', 'john'],
      host: 'foo.com',
      protocol: 'https://',
    })
  })
  it('should with host and url', () => {
    const result = chunkUrl('foo.com/bar/john')
    expect(result).toEqual({
      chunkedUrl: ['bar', 'john'],
      host: 'foo.com',
    })
  })
  it('should with url', () => {
    const result = chunkUrl('foo/bar/john')
    expect(result).toEqual({
      chunkedUrl: ['foo', 'bar', 'john'],
    })
  })
})

describe('resolveQuery', () => {
  it('should ', () => {
    const result = resolveQuery({
      bar: '_bar',
      foo: '_foo',
      john: '_john',
    })

    expect(result).toBe('?bar=_bar&foo=_foo&john=_john')
  })
})
