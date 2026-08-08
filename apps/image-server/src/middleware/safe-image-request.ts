/* eslint-disable no-magic-numbers -- CIDR prefix lengths and byte units are protocol constants. */
import {lookup} from 'node:dns'
import {BlockList, isIP, type LookupFunction} from 'node:net'

export const DEFAULT_MAX_IMAGE_BYTES = 10 * 1024 * 1024

const HTTP_STATUS_BAD_REQUEST = 400
const blockedIPv4Networks = new BlockList()
const blockedIPv6Networks = new BlockList()

blockedIPv4Networks.addSubnet('0.0.0.0', 8, 'ipv4')
blockedIPv4Networks.addSubnet('10.0.0.0', 8, 'ipv4')
blockedIPv4Networks.addSubnet('100.64.0.0', 10, 'ipv4')
blockedIPv4Networks.addSubnet('127.0.0.0', 8, 'ipv4')
blockedIPv4Networks.addSubnet('169.254.0.0', 16, 'ipv4')
blockedIPv4Networks.addSubnet('172.16.0.0', 12, 'ipv4')
blockedIPv4Networks.addSubnet('192.0.0.0', 24, 'ipv4')
blockedIPv4Networks.addSubnet('192.168.0.0', 16, 'ipv4')
blockedIPv4Networks.addSubnet('198.18.0.0', 15, 'ipv4')
blockedIPv4Networks.addSubnet('224.0.0.0', 3, 'ipv4')
blockedIPv6Networks.addAddress('::', 'ipv6')
blockedIPv6Networks.addAddress('::1', 'ipv6')
blockedIPv6Networks.addSubnet('::ffff:0:0', 96, 'ipv6')
blockedIPv6Networks.addSubnet('fc00::', 7, 'ipv6')
blockedIPv6Networks.addSubnet('fe80::', 9, 'ipv6')

export class ImageRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message)
    this.name = 'ImageRequestError'
  }
}

export const isPrivateNetworkAddress = (address: string): boolean => {
  const [normalized] = address.toLowerCase().split('%')
  const version = isIP(normalized)

  if (version === 4) {
    return blockedIPv4Networks.check(normalized, 'ipv4')
  }

  if (version === 6) {
    return blockedIPv6Networks.check(normalized, 'ipv6')
  }

  return false
}

export const assertPublicHttpUrl = (value: string | URL): URL => {
  let url: URL

  try {
    url = value instanceof URL ? value : new URL(value)
  } catch {
    throw new ImageRequestError('Invalid image URL', HTTP_STATUS_BAD_REQUEST)
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new ImageRequestError('Only public HTTP image URLs are allowed', HTTP_STATUS_BAD_REQUEST)
  }

  const hostname = url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname

  if (isIP(hostname) && isPrivateNetworkAddress(hostname)) {
    throw new ImageRequestError(
      'Private network image URLs are not allowed',
      HTTP_STATUS_BAD_REQUEST,
    )
  }

  return url
}

export const safeDnsLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, {...options, all: true}, (error, addresses) => {
    if (error) {
      callback(error, [], undefined)
      return
    }

    if (addresses.length === 0 || addresses.some(({address}) => isPrivateNetworkAddress(address))) {
      callback(
        new ImageRequestError(
          'Private network image URLs are not allowed',
          HTTP_STATUS_BAD_REQUEST,
        ),
        [],
        undefined,
      )
      return
    }

    if (options.all) {
      callback(null, addresses)
      return
    }

    const [address] = addresses
    callback(null, address.address, address.family)
  })
}
