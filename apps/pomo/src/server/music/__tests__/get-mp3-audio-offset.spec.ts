import {describe, expect, it} from 'vitest'
import {getMp3AudioOffset} from '../get-mp3-audio-offset'

describe('getMp3AudioOffset', () => {
  it('should leave untagged audio at the start', () => {
    expect(getMp3AudioOffset(new Uint8Array([0xff, 0xfb, 0x90]))).toBe(0)
  })
  it.each([2, 3, 4])('should read a v%i tag offset without downloading its body', (version) => {
    const header = new Uint8Array([0x49, 0x44, 0x33, version, 0, 0, 0x01, 0, 0, 0])
    expect(getMp3AudioOffset(header)).toBe(2_097_162)
  })
  it('should include an ID3 v4 footer', () => {
    const header = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0x10, 0, 0, 0, 1])
    expect(getMp3AudioOffset(header)).toBe(21)
  })
  it.each([
    [0x49, 0x44, 0x33],
    [0x49, 0x44, 0x33, 4, 0, 0, 0x80, 0, 0, 0],
  ])('should reject a malformed tag header %j', (...header) => {
    expect(() => getMp3AudioOffset(new Uint8Array(header))).toThrow('invalid_mp3_id3')
  })
})
