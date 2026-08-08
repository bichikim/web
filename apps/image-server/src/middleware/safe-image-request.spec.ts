import {describe, expect, it} from 'vitest'
import {assertPublicHttpUrl, isPrivateNetworkAddress} from './safe-image-request'

describe('safe image request', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
  ])('recognizes private network address %s', (address) => {
    expect(isPrivateNetworkAddress(address)).toBe(true)
  })

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])(
    'allows public network address %s',
    (address) => {
      expect(isPrivateNetworkAddress(address)).toBe(false)
    },
  )

  it.each(['file:///etc/passwd', 'ftp://example.com/image.png', 'http://127.0.0.1/image.png'])(
    'rejects unsafe URL %s',
    (url) => {
      expect(() => assertPublicHttpUrl(url)).toThrow()
    },
  )

  it('accepts a public HTTP URL', () => {
    expect(assertPublicHttpUrl('https://example.com/image.png').href).toBe(
      'https://example.com/image.png',
    )
  })
})
