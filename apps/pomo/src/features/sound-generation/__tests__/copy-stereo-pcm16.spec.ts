/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'
import {copyStereoPcm16} from '../copy-stereo-pcm16'

describe('copyStereoPcm16', () => {
  it('should normalize separate signed little-endian channels from an offset view', () => {
    const bytes = Uint8Array.of(99, 99, 0, 128, 255, 127, 0, 64, 0, 192, 99, 99)
    const before = bytes.slice()
    const left = new Float32Array(2)
    const right = new Float32Array(2)

    copyStereoPcm16({frames: 2, left, right, source: new DataView(bytes.buffer, 2, 8)})

    expect(left).toEqual(Float32Array.of(-1, 0.5))
    expect(right).toEqual(Float32Array.of(32767 / 32768, -0.5))
    expect(bytes).toEqual(before)
  })

  it('should copy only requested frames at the destination offset and preserve padding', () => {
    const bytes = Uint8Array.of(0, 64, 0, 192, 0, 128, 255, 127, 1, 0, 2, 0)
    const left = new Float32Array(5).fill(0.25)
    const right = new Float32Array(5).fill(-0.25)

    copyStereoPcm16({
      frames: 2,
      left,
      right,
      source: new DataView(bytes.buffer),
      startFrame: 2,
    })

    expect(left).toEqual(Float32Array.of(0.25, 0.25, 0.5, -1, 0.25))
    expect(right).toEqual(Float32Array.of(-0.25, -0.25, -0.5, 32767 / 32768, -0.25))
  })

  it('should leave channels untouched when no frames are requested', () => {
    const left = Float32Array.of(0.25)
    const right = Float32Array.of(-0.25)
    const source = new DataView(new ArrayBuffer(0))
    const read = vi.spyOn(source, 'getInt16')

    copyStereoPcm16({frames: 0, left, right, source})

    expect(left).toEqual(Float32Array.of(0.25))
    expect(right).toEqual(Float32Array.of(-0.25))
    expect(read).not.toHaveBeenCalled()
  })

  it('should write the right sample last when destinations alias each other', () => {
    const bytes = Uint8Array.of(0, 64, 0, 192, 0, 128, 255, 127)
    const channels = new Float32Array(2)

    copyStereoPcm16({
      frames: 2,
      left: channels,
      right: channels,
      source: new DataView(bytes.buffer),
    })

    expect(channels).toEqual(Float32Array.of(-0.5, 32767 / 32768))
  })

  it('should preserve completed channel writes before a truncated right sample throws', () => {
    const bytes = Uint8Array.of(0, 64, 0, 192, 0, 128)
    const source = new DataView(bytes.buffer)
    const left = new Float32Array(2).fill(0.25)
    const right = new Float32Array(2).fill(-0.25)

    expect(() => copyStereoPcm16({frames: 2, left, right, source})).toThrow(RangeError)

    expect(left).toEqual(Float32Array.of(0.5, -1))
    expect(right).toEqual(Float32Array.of(-0.5, -0.25))
  })
})
