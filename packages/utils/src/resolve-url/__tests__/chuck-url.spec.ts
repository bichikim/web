import {chunkUrl} from '../'

describe('chunk-url', () => {
  it('should return url information', () => {
    const info = chunkUrl('https://foo.com/foo/bar')
    expect(info).toEqual({
      chunkedUrl: ['foo', 'bar'],
      host: 'foo.com',
      protocol: 'https://',
    })
  })
})
