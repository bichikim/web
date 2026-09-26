import {decodePcm16Wav} from '../../utils/decode-pcm16-wav/index.ts'
import {encodeMonoPcm16Wav} from '../../utils/encode-mono-pcm16-wav/index.ts'
// oxlint-disable no-magic-numbers -- WAV offsets and PCM ranges are fixed by the audio format.

import {RunnerExecutionError} from './errors.ts'

const MINIMUM_SAMPLE_RATE = 8000
const MAXIMUM_RESAMPLED_BYTES = 64 * 1024 * 1024

export interface DecodedAudio {
  readonly sampleRate: number
  readonly samples: Float32Array
}

export const decodePcmWav = (bytes: Uint8Array): DecodedAudio => {
  const decoded = decodePcm16Wav(bytes, {truncatedData: 'read-available'})
  if (decoded === null) {
    throw new RunnerExecutionError(
      'invalid-audio',
      'The runner accepts only uncompressed 16-bit PCM WAV input',
    )
  }
  if (decoded.sampleRate < MINIMUM_SAMPLE_RATE) {
    throw new RunnerExecutionError('invalid-audio', 'The WAV sample rate must be at least 8000 Hz')
  }
  return {sampleRate: decoded.sampleRate, samples: decoded.samples}
}

export const resampleAudio = (audio: DecodedAudio, targetSampleRate: number): Float32Array => {
  if (audio.sampleRate === targetSampleRate) {
    return audio.samples
  }

  const outputLength = Math.max(
    1,
    Math.round((audio.samples.length * targetSampleRate) / audio.sampleRate),
  )
  if (
    !Number.isSafeInteger(outputLength) ||
    outputLength * Float32Array.BYTES_PER_ELEMENT > MAXIMUM_RESAMPLED_BYTES
  ) {
    throw new RunnerExecutionError('invalid-audio', 'Audio exceeds the runner resampling limit')
  }
  const output = new Float32Array(outputLength)
  const ratio = audio.sampleRate / targetSampleRate
  for (let index = 0; index < output.length; index += 1) {
    const sourcePosition = index * ratio
    const left = Math.min(audio.samples.length - 1, Math.floor(sourcePosition))
    const right = Math.min(audio.samples.length - 1, left + 1)
    const weight = sourcePosition - left
    output[index] = (audio.samples[left] ?? 0) * (1 - weight) + (audio.samples[right] ?? 0) * weight
  }
  return output
}

export const createWaveBuffer = (samples: Float32Array, sampleRate: number): Uint8Array =>
  new Uint8Array(encodeMonoPcm16Wav(samples, sampleRate))
