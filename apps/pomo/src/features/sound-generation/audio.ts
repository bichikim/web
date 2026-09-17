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
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }
  text(0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 2, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * STEREO_FRAME_BYTES, true)
  view.setUint16(32, STEREO_FRAME_BYTES, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, frames * STEREO_FRAME_BYTES, true)
  for (let index = 0; index < frames * 2; index += 1) {
    view.setInt16(WAV_HEADER_BYTES + index * 2, Math.max(-32768, Math.min(32767, pcm[index])), true)
  }
  return new Blob([buffer], {type: 'audio/wav'})
}
