/**
 * Vowel weights from an audio frame for mouth shapes (the role of Cubism's MotionSync), by
 * independent textbook speech analysis: linear prediction gives the spectral envelope, its
 * first two resonances (formants F1 and F2) are compared with each vowel's.
 */
import {PUPPET_VOWELS, type PuppetVowel, type PuppetVowelWeights} from '../document'
import vowelFormants from './vowel-formants.json'

export interface VowelAnalysis {
  /** Voice activity from the frame's loudness, 0 (silence) to 1. */
  readonly level: number
  /** Per vowel, summing to `level`. */
  readonly weights: PuppetVowelWeights
}

export interface AnalyzeVowelsOptions {
  /** Loudness (dBFS) at and below which the frame is silent. */
  readonly silenceDecibels?: number
  /** Loudness (dBFS) at and above which the frame is fully voiced. */
  readonly fullDecibels?: number
}

type Formants = readonly [number, number]

/**
 * Approximate F1 and F2 (Hz) of the five Japanese vowels for an adult male and an adult female
 * voice, plus the rounded back u of Korean or English (the same pursed mouth). A vowel scores by
 * its closest reference.
 */
const VOWEL_FORMANTS: Readonly<Record<PuppetVowel, ReadonlyArray<ReadonlyArray<number>>>> =
  vowelFormants

const ANALYSIS_RATE = 8000
const LPC_ORDER = 10
const PRE_EMPHASIS = 0.97
const ENVELOPE_STEP = 10
const ENVELOPE_MINIMUM = 150
const ENVELOPE_MAXIMUM = 3500
const F1_MAXIMUM = 1100
const F2_SEPARATION = 200
/** Width, in log frequency, of a vowel's region. */
const VOWEL_SPREAD = 0.25
const DEFAULT_SILENCE_DECIBELS = -50
const DEFAULT_FULL_DECIBELS = -25
const HAMMING_BASE = 0.54
const HAMMING_SWING = 0.46
const POWER_DECIBELS = 10
const LOWEST_PITCH = 60
const HIGHEST_PITCH = 400
/** Normalized autocorrelation at the pitch period above which a frame is voiced. */
const VOICING = 0.3

/** Weights from one value per vowel in `PUPPET_VOWELS` order. */
export const toVowelWeights = (values: ReadonlyArray<number>): PuppetVowelWeights =>
  Object.fromEntries(
    PUPPET_VOWELS.map((vowel, index) => [vowel, values[index] ?? 0]),
  ) as PuppetVowelWeights

const SILENT = toVowelWeights([])

/** Averages groups of `factor` samples: a crude low-pass and decimation to about 8 kHz. */
const decimate = (samples: ArrayLike<number>, factor: number) =>
  Float64Array.from({length: Math.floor(samples.length / factor)}, (_, index) => {
    let sum = 0
    for (let offset = 0; offset < factor; offset += 1) {
      sum += samples[index * factor + offset]!
    }
    return sum / factor
  })

const windowed = (samples: Float64Array) =>
  samples.map((value, index) => {
    const emphasized = index === 0 ? value : value - PRE_EMPHASIS * samples[index - 1]!
    const phase = (2 * Math.PI * index) / Math.max(1, samples.length - 1)
    return emphasized * (HAMMING_BASE - HAMMING_SWING * Math.cos(phase))
  })

const autocorrelation = (samples: Float64Array, order: number) =>
  Array.from({length: order + 1}, (_, lag) => {
    let sum = 0
    for (let index = lag; index < samples.length; index += 1) {
      sum += samples[index]! * samples[index - lag]!
    }
    return sum
  })

/** Levinson–Durbin recursion: coefficients with `A(z) = 1 + Σ c_k z^-k`, `c_0 = 1`. */
const linearPrediction = (
  correlation: ReadonlyArray<number>,
  order: number,
): number[] | undefined => {
  let error = correlation[0]!
  if (!(error > 0)) {
    return undefined
  }
  let coefficients = [1]
  for (let step = 1; step <= order; step += 1) {
    let sum = correlation[step]!
    for (let lag = 1; lag < step; lag += 1) {
      sum += coefficients[lag]! * correlation[step - lag]!
    }
    const reflection = -sum / error
    const next = [...coefficients, 0]
    for (let lag = 1; lag <= step; lag += 1) {
      next[lag] = coefficients[lag]! + reflection * (coefficients[step - lag] ?? 0)
    }
    next[step] = reflection
    coefficients = next
    error *= 1 - reflection * reflection
    if (!(error > 0)) {
      return undefined
    }
  }
  return coefficients
}

/** Log power of `1 / A` at `frequency`. */
const envelopeAt = (coefficients: ReadonlyArray<number>, frequency: number, rate: number) => {
  const omega = (2 * Math.PI * frequency) / rate
  let real = 0
  let imaginary = 0
  for (const [lag, coefficient] of coefficients.entries()) {
    real += coefficient * Math.cos(omega * lag)
    imaginary -= coefficient * Math.sin(omega * lag)
  }
  return -Math.log(real * real + imaginary * imaginary)
}

/** F1 and F2: the first envelope peak up to 1100 Hz and the next at least 200 Hz above it. */
const findFormants = (coefficients: ReadonlyArray<number>, rate: number): Formants | undefined => {
  const peaks: number[] = []
  let previous = envelopeAt(coefficients, ENVELOPE_MINIMUM - ENVELOPE_STEP, rate)
  let current = envelopeAt(coefficients, ENVELOPE_MINIMUM, rate)
  for (
    let frequency = ENVELOPE_MINIMUM;
    frequency <= ENVELOPE_MAXIMUM;
    frequency += ENVELOPE_STEP
  ) {
    const next = envelopeAt(coefficients, frequency + ENVELOPE_STEP, rate)
    if (current > previous && current >= next) {
      peaks.push(frequency)
    }
    previous = current
    current = next
  }
  const first = peaks.find((frequency) => frequency <= F1_MAXIMUM)
  const second =
    first === undefined ? undefined : peaks.find((frequency) => frequency >= first + F2_SEPARATION)
  return first === undefined || second === undefined ? undefined : [first, second]
}

/**
 * Whether the frame is periodic, as voiced speech is: its normalized autocorrelation peaks
 * above 0.3 at some lag within the 60–400 Hz pitch range. Noise and unvoiced consonants are not.
 */
const isVoiced = (samples: Float64Array, rate: number) => {
  const shortest = Math.floor(rate / HIGHEST_PITCH)
  const longest = Math.min(samples.length - 1, Math.ceil(rate / LOWEST_PITCH))
  const correlation = autocorrelation(samples, longest)
  const energy = correlation[0]!
  return correlation.some((value, lag) => lag >= shortest && value > VOICING * energy)
}

/**
 * F1 and F2 (Hz) of a frame, or `undefined` when it is unvoiced or its envelope has no two
 * resonances.
 */
export const estimateFormants = (samples: ArrayLike<number>, sampleRate: number) => {
  const factor = Math.max(1, Math.floor(sampleRate / ANALYSIS_RATE))
  const rate = sampleRate / factor
  const decimated = decimate(samples, factor)
  if (!isVoiced(decimated, rate)) {
    return undefined
  }
  const frame = windowed(decimated)
  const coefficients = linearPrediction(autocorrelation(frame, LPC_ORDER), LPC_ORDER)
  return coefficients === undefined ? undefined : findFormants(coefficients, rate)
}

/** Soft vowel weights from the formants' log distance to each vowel's, summing to 1. */
const weighVowels = ([first, second]: Formants) => {
  const scores = PUPPET_VOWELS.map((vowel) => {
    const distance = Math.min(
      ...VOWEL_FORMANTS[vowel].map((reference) =>
        Math.hypot(Math.log(first / reference[0]!), Math.log(second / reference[1]!)),
      ),
    )
    return Math.exp(-((distance / VOWEL_SPREAD) ** 2))
  })
  const total = scores.reduce((sum, score) => sum + score, 0)
  return scores.map((score) => (total > 0 ? score / total : 0))
}

/**
 * Loudness of a frame from 0 (silence) to 1, voiced or not (Cubism's volume lip sync): its mean
 * power in dBFS mapped linearly between `silenceDecibels` and `fullDecibels`.
 */
export const measureVoiceLevel = (
  samples: ArrayLike<number>,
  options: AnalyzeVowelsOptions = {},
) => {
  let power = 0
  for (let index = 0; index < samples.length; index += 1) {
    power += samples[index]! ** 2
  }
  const decibels = POWER_DECIBELS * Math.log10(power / Math.max(1, samples.length))
  const silence = options.silenceDecibels ?? DEFAULT_SILENCE_DECIBELS
  const full = options.fullDecibels ?? DEFAULT_FULL_DECIBELS
  return Number.isFinite(decibels)
    ? Math.min(1, Math.max(0, (decibels - silence) / (full - silence)))
    : 0
}

/**
 * Vowel weights of one frame of mono samples (about 20–50 ms) at `sampleRate`. An unvoiced
 * frame (noise, consonants such as s) or one without two resonances counts as silence.
 */
export const analyzeVowels = (
  samples: ArrayLike<number>,
  sampleRate: number,
  options: AnalyzeVowelsOptions = {},
): VowelAnalysis => {
  const level = measureVoiceLevel(samples, options)
  const formants = level > 0 ? estimateFormants(samples, sampleRate) : undefined
  return formants === undefined
    ? {level: 0, weights: SILENT}
    : {level, weights: toVowelWeights(weighVowels(formants).map((weight) => weight * level))}
}
