/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {encodeMonoPcm16Wav} from '..'

describe('encodeMonoPcm16Wav', () => {
  it('should encode RIFF fields and clip signed samples without mutating input', () => {
    const samples = new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2])
    const buffer = encodeMonoPcm16Wav(samples, 24000)
    const view = new DataView(buffer)
    expect(new TextDecoder().decode(new Uint8Array(buffer, 0, 4))).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(buffer.byteLength - 8)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(24000)
    expect(view.getUint32(28, true)).toBe(48000)
    expect(view.getUint32(40, true)).toBe(14)
    expect(
      Array.from({length: samples.length}, (_, index) => view.getInt16(44 + index * 2, true)),
    ).toEqual([-32768, -32768, -16384, 0, 16383, 32767, 32767])
    expect(samples[0]).toBe(-2)
  })
  it('should encode an empty data chunk', () => {
    const bytes = encodeMonoPcm16Wav(new Float32Array(), 8000)
    expect(bytes.byteLength).toBe(44)
    expect(new DataView(bytes).getUint32(40, true)).toBe(0)
  })
})
