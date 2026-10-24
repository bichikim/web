import {clamp} from 'es-toolkit/math'
// oxlint-disable no-magic-numbers -- Fixed PCM header fields and the official SA3 LogSNR schedule.
import {SAMPLE_RATE, STEREO_FRAME_BYTES, WAV_HEADER_BYTES} from './connection'

export function createSchedule(steps: number): number[] {
  return Array.from({length: steps + 1}, (_, index) => {
    if (index === 0) {
      return 1
    }
    if (index === steps) {
      return 0
    }
    const time = 1 - index / steps
    return 1 / (1 + Math.exp(2 - time * 8.2))
  })
}

/** Encodes interleaved signed PCM from the official SAME-S decoder as a stereo WAV. */
export function createStereoWave(pcm: Int32Array, frames: number): Blob {
  if (pcm.length < frames * 2) {
    throw new Error('Decoder output is shorter than requested')
  }
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + frames * STEREO_FRAME_BYTES)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  const encoder = new TextEncoder()
  encoder.encodeInto('RIFF', bytes.subarray(0, 4))
  view.setUint32(4, buffer.byteLength - 8, true)
  encoder.encodeInto('WAVE', bytes.subarray(8, 12))
  encoder.encodeInto('fmt ', bytes.subarray(12, 16))
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 2, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * STEREO_FRAME_BYTES, true)
  view.setUint16(32, STEREO_FRAME_BYTES, true)
  view.setUint16(34, 16, true)
  encoder.encodeInto('data', bytes.subarray(36, 40))
  view.setUint32(40, frames * STEREO_FRAME_BYTES, true)
  for (let index = 0; index < frames * 2; index += 1) {
    view.setInt16(WAV_HEADER_BYTES + index * 2, clamp(pcm[index], -32768, 32767), true)
  }
  return new Blob([buffer], {type: 'audio/wav'})
}
