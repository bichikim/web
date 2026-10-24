import {resampleLinear} from 'src/utils/resample-linear'
// oxlint-disable no-magic-numbers -- Opus supports this fixed set of PCM sample rates.
const OPUS_OUTPUT_SAMPLE_RATE = 48_000
const OPUS_SAMPLE_RATES: ReadonlyArray<number> = [8000, 12_000, 16_000, 24_000, 48_000]

export interface OpusEncodingInput {
  readonly sampleRate: number
  readonly samples: Float32Array
}

const isSupportedSampleRate = (sampleRate: number) => OPUS_SAMPLE_RATES.includes(sampleRate)

/** Preserves Opus-native PCM or linearly resamples legacy browser WAV rates to 48 kHz. */
export const getOpusEncodingInput = (
  samples: Float32Array,
  sampleRate: number,
): OpusEncodingInput => {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError(`Invalid audio sample rate: ${sampleRate}`)
  }

  if (isSupportedSampleRate(sampleRate)) {
    return {sampleRate, samples}
  }

  const outputLength =
    samples.length === 0
      ? 0
      : Math.max(1, Math.round((samples.length * OPUS_OUTPUT_SAMPLE_RATE) / sampleRate))
  const output = resampleLinear({
    outputLength,
    samples,
    sourceStep: sampleRate / OPUS_OUTPUT_SAMPLE_RATE,
  })

  return {sampleRate: OPUS_OUTPUT_SAMPLE_RATE, samples: output}
}
