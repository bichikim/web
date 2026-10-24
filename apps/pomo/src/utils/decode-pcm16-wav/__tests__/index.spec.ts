/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {encodeMonoPcm16Wav} from '../../encode-mono-pcm16-wav'
import {decodePcm16Wav} from '..'

describe('decodePcm16Wav', () => {
  it('should preserve interleaved stereo channels without including adjacent bytes', () => {
    const buffer = encodeMonoPcm16Wav(new Float32Array([-1, 1, 0, 0.5]), 24000)
    const view = new DataView(buffer)
    view.setUint16(22, 2, true)
    view.setUint32(28, 96000, true)
    view.setUint16(32, 4, true)
    const bytes = new Uint8Array(buffer.byteLength + 8)
    bytes.set(new Uint8Array(buffer), 4)
    const result = decodePcm16Wav(bytes.subarray(4, 4 + buffer.byteLength))
    expect(result?.channels).toBe(2)
    expect(result?.sampleRate).toBe(24000)
    expect(result?.samples).toEqual(Float32Array.of(-1, 32767 / 32768, 0, 16383 / 32768))
  })
  it('should preserve three channels in frame order', () => {
    const buffer = encodeMonoPcm16Wav(Float32Array.of(-1, 0, 1, 0.5, -0.5, 0), 24000)
    const view = new DataView(buffer)
    view.setUint16(22, 3, true)
    view.setUint32(28, 144000, true)
    view.setUint16(32, 6, true)
    expect(decodePcm16Wav(buffer)).toEqual({
      channels: 3,
      sampleRate: 24000,
      samples: Float32Array.of(-1, 0, 32767 / 32768, 16383 / 32768, -0.5, 0),
    })
  })

  it('should retain only complete channel frames when reading truncated data', () => {
    const buffer = encodeMonoPcm16Wav(Float32Array.of(-1, 1, 0.5, 0.5), 24000)
    const view = new DataView(buffer)
    view.setUint16(22, 2, true)
    view.setUint32(28, 96000, true)
    view.setUint16(32, 4, true)
    const bytes = new Uint8Array(buffer).slice(0, -2)
    expect(decodePcm16Wav(bytes)).toBeNull()
    expect(decodePcm16Wav(bytes, {truncatedData: 'read-available'})).toEqual({
      channels: 2,
      sampleRate: 24000,
      samples: Float32Array.of(-1, 32767 / 32768),
    })
  })

  it('should honor odd unknown chunk padding', () => {
    const original = new Uint8Array(encodeMonoPcm16Wav(new Float32Array([-1]), 8000))
    const bytes = new Uint8Array(original.length + 10)
    bytes.set(original.subarray(0, 12))
    bytes.set(new TextEncoder().encode('JUNK'), 12)
    new DataView(bytes.buffer).setUint32(16, 1, true)
    bytes.set(original.subarray(12), 22)
    expect(decodePcm16Wav(bytes)?.samples).toEqual(new Float32Array([-1]))
  })
  it('should reject malformed and unsupported format fields without throwing', () => {
    expect(decodePcm16Wav(new ArrayBuffer(0))).toBeNull()
    for (const [offset, value] of [
      [20, 3],
      [22, 0],
      [24, 0],
      [34, 8],
    ]) {
      const bytes = encodeMonoPcm16Wav(new Float32Array([1]), 8000)
      new DataView(bytes).setUint16(offset, value, true)
      expect(decodePcm16Wav(bytes)).toBeNull()
    }
    const bytes = encodeMonoPcm16Wav(new Float32Array([1]), 8000)
    new DataView(bytes).setUint32(16, 1000, true)
    expect(decodePcm16Wav(bytes)).toBeNull()
  })
  it('should allow partial data only when the caller selects that policy', () => {
    const bytes = new Uint8Array(encodeMonoPcm16Wav(new Float32Array([-1, 1]), 8000)).slice(0, -2)
    expect(decodePcm16Wav(bytes)).toBeNull()
    expect(decodePcm16Wav(bytes, {truncatedData: 'read-available'})?.samples).toEqual(
      new Float32Array([-1]),
    )
  })
})
