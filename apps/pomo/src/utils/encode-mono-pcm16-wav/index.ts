import {clamp} from 'es-toolkit/math'
// oxlint-disable no-magic-numbers -- These constants are fixed offsets and ranges in the PCM WAV specification.
/** Encodes mono float samples as little-endian PCM16 RIFF/WAVE bytes. */
export const encodeMonoPcm16Wav = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
  const headerSize = 44
  const buffer = new ArrayBuffer(headerSize + samples.length * 2)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  const encoder = new TextEncoder()

  encoder.encodeInto('RIFF', bytes.subarray(0, 4))
  view.setUint32(4, buffer.byteLength - 8, true)
  encoder.encodeInto('WAVE', bytes.subarray(8, 12))
  encoder.encodeInto('fmt ', bytes.subarray(12, 16))
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  encoder.encodeInto('data', bytes.subarray(36, 40))
  view.setUint32(40, samples.length * 2, true)

  for (let index = 0; index < samples.length; index += 1) {
    const sample = clamp(samples[index], -1, 1)
    view.setInt16(headerSize + index * 2, sample < 0 ? sample * 32_768 : sample * 32_767, true)
  }

  return buffer
}
