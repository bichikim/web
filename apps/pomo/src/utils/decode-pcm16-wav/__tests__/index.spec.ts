/** @vitest-environment node */
import {expect, it} from 'vitest'
import {encodeMonoPcm16Wav} from '../../encode-mono-pcm16-wav'
import {decodePcm16Wav} from '..'

it('should decode a byte view without including adjacent bytes and average stereo frames', () => {
  const buffer = encodeMonoPcm16Wav(new Float32Array([-1, 1, 0, 0.5]), 24000)
  new DataView(buffer).setUint16(22, 2, true)
  const bytes = new Uint8Array(buffer.byteLength + 8)
  bytes.set(new Uint8Array(buffer), 4)
  const result = decodePcm16Wav(bytes.subarray(4, 4 + buffer.byteLength))
  expect(result?.channels).toBe(2)
  expect(result?.sampleRate).toBe(24000)
  expect(result?.samples[0]).toBeCloseTo(-1 / 65536)
  expect(result?.samples[1]).toBeCloseTo(16383 / 65536)
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
