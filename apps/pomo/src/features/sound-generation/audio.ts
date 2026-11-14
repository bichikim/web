import {clamp} from 'es-toolkit/math'
import {createPcm16WavBuffer} from 'src/utils/create-pcm16-wav-buffer'
// oxlint-disable no-magic-numbers -- PCM16 sample bounds and the official SA3 LogSNR schedule.
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
  const buffer = createPcm16WavBuffer({
    channels: 2,
    dataBytes: frames * STEREO_FRAME_BYTES,
    sampleRate: SAMPLE_RATE,
  })
  const view = new DataView(buffer)
  for (let index = 0; index < frames * 2; index += 1) {
    view.setInt16(WAV_HEADER_BYTES + index * 2, clamp(pcm[index], -32768, 32767), true)
  }
  return new Blob([buffer], {type: 'audio/wav'})
}
