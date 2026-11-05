/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {sha256Hex} from '..'

afterEach(() => vi.restoreAllMocks())

describe('sha256Hex', () => {
  it('should return the standard lowercase digest and respect a view byte range', async () => {
    const bytes = new TextEncoder().encode('_abc_')
    expect(await sha256Hex(bytes.subarray(1, 4))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(await sha256Hex(new ArrayBuffer(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('should hash only a DataView byte range', async () => {
    const bytes = new TextEncoder().encode('_abc_')
    expect(await sha256Hex(new DataView(bytes.buffer, 1, 3))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('should preserve leading zero bytes in a real digest', async () => {
    expect(await sha256Hex(new TextEncoder().encode('286').buffer)).toBe(
      '00328ce57bbc14b33bd6695bc8eb32cdf2fb5f3a7d89ec14a42825e15d39df60',
    )
  })

  it.each([
    [0, '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'],
    [32, '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f'],
    [64, '404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f'],
    [96, '606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f'],
    [128, '808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f'],
    [160, 'a0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebf'],
    [192, 'c0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedf'],
    [224, 'e0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff'],
  ])('should encode every digest byte in the block starting at %i', async (start, expected) => {
    const digest = Uint8Array.from({length: 32}, (_, index) => start + index)
    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(digest.buffer)

    expect(await sha256Hex(new ArrayBuffer(0))).toBe(expected)
  })

  it('should retain all zero digest bytes', async () => {
    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(new Uint8Array(32).buffer)

    expect(await sha256Hex(new ArrayBuffer(0))).toBe('00'.repeat(32))
  })

  it('should pass the original view to SHA-256 exactly once', async () => {
    const input = new Uint8Array([0, 97, 98, 99, 0]).subarray(1, 4)
    const digest = vi.spyOn(crypto.subtle, 'digest')

    await sha256Hex(input)

    expect(digest).toHaveBeenCalledExactlyOnceWith('SHA-256', input)
    expect(digest.mock.calls[0][1]).toBe(input)
  })

  it('should preserve a digest rejection by identity', () => {
    const reason = new DOMException('digest failed', 'OperationError')
    vi.spyOn(crypto.subtle, 'digest').mockRejectedValue(reason)

    return expect(sha256Hex(new ArrayBuffer(0))).rejects.toBe(reason)
  })

  it('should preserve a synchronous digest failure by identity', () => {
    const reason = new TypeError('invalid source')
    vi.spyOn(crypto.subtle, 'digest').mockImplementation(() => {
      throw reason
    })

    return expect(sha256Hex(new ArrayBuffer(0))).rejects.toBe(reason)
  })
})
