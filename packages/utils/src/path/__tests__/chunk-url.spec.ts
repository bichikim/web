import {chunkUrl} from '../chunk-url'
import {describe, expect, it} from 'vitest'

describe('chunkUrl', () => {
  it('should with protocol, host and url', () => {
    const result = chunkUrl('https://foo.com/bar/john')

    expect(result).toEqual({
      chunkedUrl: ['bar', 'john'],
      host: 'foo.com',
      protocol: 'https://',
    })
  })

  it('should with protocol, query, host and url', () => {
    const result = chunkUrl('https://foo.com/bar/john?hello=world&foo=bar')

    expect(result).toEqual({
      chunkedUrl: ['bar', 'john'],
      host: 'foo.com',
      protocol: 'https://',
      query: 'hello=world&foo=bar',
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
