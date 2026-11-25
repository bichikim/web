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
 * F1/F2 references cover front and back realizations of the five mouth poses, including
 * rounded Korean u and close-mid e. A vowel scores by its closest reference.
 */
const VOWEL_FORMANTS: Readonly<Record<PuppetVowel, ReadonlyArray<ReadonlyArray<number>>>> =
  vowelFormants

const ANALYSIS_RATE = 8000
const REFINEMENT_RATE = 12000
const REFINEMENT_PITCH = 180
const RESAMPLE_CUTOFF = 0.45
const RESAMPLE_LOBES = 16
const REFINEMENT_ORDER = 10
const REFINEMENT_EMPHASIS = 0.97
const GAUSSIAN_WIDTH = 6
const GAUSSIAN_EXPONENT = -0.5
const FORMANT_CONFIDENCE = 0.8
const FUNDAMENTAL_RANGE = 1.5
const PITCH_CONFIDENCE = 0.5
const PITCH_PEAK_RATIO = 0.9
// Four resonance pairs at 8 kHz avoid fitting an extra pole pair to voice harmonics.
const LPC_ORDER = 8
// Retain enough low-frequency energy to resolve close vowels' first resonance.
const PRE_EMPHASIS = 0.85
const ENVELOPE_STEP = 10
const ENVELOPE_MINIMUM = 150
const ENVELOPE_MAXIMUM = 3500
const F1_MAXIMUM = 1100
const F2_SEPARATION = 200
const MAXIMUM_BANDWIDTH = 400
const ROOT_PHASE = 0.25
const ROOT_ITERATIONS = 100
const ROOT_TOLERANCE = 1e-8
/** Width, in log frequency, of a vowel's region. */
const VOWEL_SPREAD = 0.25
const DEFAULT_SILENCE_DECIBELS = -50
const DEFAULT_FULL_DECIBELS = -25
const WINDOW_BASE = 0.5
const WINDOW_SWING = 0.5
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
    return emphasized * (WINDOW_BASE - WINDOW_SWING * Math.cos(phase))
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

type Complex = readonly [real: number, imaginary: number]

/** Simultaneous correction of one polynomial root relative to the other current estimates. */
const correctRoot = (
  coefficients: ReadonlyArray<number>,
  roots: ReadonlyArray<Complex>,
  index: number,
): Complex => {
  const [real, imaginary] = roots[index]!
  let valueReal = 0
  let valueImaginary = 0
  for (const coefficient of coefficients) {
    ;[valueReal, valueImaginary] = [
      valueReal * real - valueImaginary * imaginary + coefficient,
      valueReal * imaginary + valueImaginary * real,
    ]
  }
  let divisorReal = 1
  let divisorImaginary = 0
  for (const [other, root] of roots.entries()) {
    if (other !== index) {
      const differenceReal = real - root[0]
      const differenceImaginary = imaginary - root[1]
      ;[divisorReal, divisorImaginary] = [
        divisorReal * differenceReal - divisorImaginary * differenceImaginary,
        divisorReal * differenceImaginary + divisorImaginary * differenceReal,
      ]
    }
  }
  const divisor = divisorReal ** 2 + divisorImaginary ** 2
  return [
    (valueReal * divisorReal + valueImaginary * divisorImaginary) / divisor,
    (valueImaginary * divisorReal - valueReal * divisorImaginary) / divisor,
  ]
}

/** Polynomial roots, or no result when the bounded iteration does not converge. */
const polynomialRoots = (
  coefficients: ReadonlyArray<number>,
): ReadonlyArray<Complex> | undefined => {
  const order = coefficients.length - 1
  let roots: ReadonlyArray<Complex> = Array.from({length: order}, (_, index): Complex => {
    const angle = ((index + ROOT_PHASE) * 2 * Math.PI) / order
    return [Math.cos(angle), Math.sin(angle)]
  })
  for (let iteration = 0; iteration < ROOT_ITERATIONS; iteration += 1) {
    const current = roots
    const shifts = current.map((_, index) => correctRoot(coefficients, current, index))
    const largest = Math.max(...shifts.map(([real, imaginary]) => Math.hypot(real, imaginary)))
    if (!Number.isFinite(largest)) {
      return undefined
    }
    roots = current.map(
      ([real, imaginary], index): Complex => [
        real - shifts[index]![0],
        imaginary - shifts[index]![1],
      ],
    )
    if (largest < ROOT_TOLERANCE) {
      return roots
    }
  }
  return undefined
}

/** Resonance frequencies whose bandwidth excludes broad spectral tilt and weak extra poles. */
const resonantFormants = (
  coefficients: ReadonlyArray<number>,
  rate: number,
): Formants | undefined => {
  const roots = polynomialRoots(coefficients)
  const resonances = roots
    ?.filter(([, imaginary]) => imaginary > 0)
    .map(([real, imaginary]) => ({
      bandwidth: (-Math.log(Math.hypot(real, imaginary)) * rate) / Math.PI,
      frequency: (Math.atan2(imaginary, real) * rate) / (2 * Math.PI),
    }))
    .filter(
      ({bandwidth, frequency}) =>
        bandwidth > 0 &&
        bandwidth < MAXIMUM_BANDWIDTH &&
        frequency >= ENVELOPE_MINIMUM &&
        frequency <= ENVELOPE_MAXIMUM,
    )
    .sort((left, right) => left.frequency - right.frequency)
  const first = resonances?.[0]?.frequency
  const second = resonances?.find(
    ({frequency}) => first !== undefined && frequency >= first + F2_SEPARATION,
  )?.frequency
  return first === undefined || first > F1_MAXIMUM || second === undefined
    ? undefined
    : [first, second]
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

/** Band-limited resampling keeps high-frequency aliases out of the LPC spectrum. */
const resample = (samples: ArrayLike<number>, sourceRate: number, rate: number) => {
  const ratio = sourceRate / rate
  const cutoff = RESAMPLE_CUTOFF / ratio
  const radius = RESAMPLE_LOBES * ratio
  return Float64Array.from({length: Math.floor(samples.length / ratio)}, (_, index) => {
    const center = index * ratio
    let sum = 0
    let total = 0
    const start = Math.max(0, Math.ceil(center - radius))
    const end = Math.min(samples.length - 1, Math.floor(center + radius))
    for (let offset = start; offset <= end; offset += 1) {
      const distance = center - offset
      const argument = 2 * Math.PI * cutoff * distance
      const sinc = argument === 0 ? 1 : Math.sin(argument) / argument
      const weight = sinc * WINDOW_BASE * (1 + Math.cos((Math.PI * distance) / radius))
      sum += samples[offset]! * weight
      total += weight
    }
    return sum / total
  })
}

/** Pitch from a prominent local maximum of the normalized autocorrelation. */
const estimatePitch = (samples: Float64Array, rate: number) => {
  const shortest = Math.floor(rate / HIGHEST_PITCH)
  const longest = Math.min(samples.length - 1, Math.ceil(rate / LOWEST_PITCH))
  const correlations = Array.from({length: Math.max(0, longest - shortest + 1)}, (_, offset) => {
    const lag = shortest + offset
    let cross = 0
    let left = 0
    let right = 0
    for (let index = lag; index < samples.length; index += 1) {
      cross += samples[index]! * samples[index - lag]!
      left += samples[index]! ** 2
      right += samples[index - lag]! ** 2
    }
    return left > 0 && right > 0 ? cross / Math.sqrt(left * right) : 0
  })
  const threshold = Math.max(PITCH_CONFIDENCE, Math.max(...correlations) * PITCH_PEAK_RATIO)
  const peak = correlations.findIndex(
    (value, index) =>
      index > 0 &&
      index < correlations.length - 1 &&
      value >= correlations[index - 1]! &&
      value >= correlations[index + 1]! &&
      value > threshold,
  )
  return peak < 0 ? undefined : rate / (shortest + peak)
}

const fitFormants = (frame: Float64Array, rate: number, order: number) => {
  const coefficients = linearPrediction(autocorrelation(frame, order), order)
  return coefficients === undefined
    ? undefined
    : (resonantFormants(coefficients, rate) ?? findFormants(coefficients, rate))
}

const refineFormants = (samples: ArrayLike<number>, sampleRate: number) => {
  const rate = Math.min(sampleRate, REFINEMENT_RATE)
  const resampled = resample(samples, sampleRate, rate)
  if (!isVoiced(resampled, rate)) {
    return undefined
  }
  const frame = resampled.map((value, index) => {
    const emphasized = index === 0 ? value : value - REFINEMENT_EMPHASIS * resampled[index - 1]!
    const position = (index - (resampled.length - 1) / 2) / (resampled.length / GAUSSIAN_WIDTH)
    return emphasized * Math.exp(GAUSSIAN_EXPONENT * position ** 2)
  })
  return fitFormants(frame, rate, REFINEMENT_ORDER)
}

/** F1/F2 of voiced audio; uncertain or pitch-locked estimates use a wider analysis ceiling. */
export const estimateFormants = (
  samples: ArrayLike<number>,
  sampleRate: number,
): Formants | undefined => {
  const factor = Math.max(1, Math.floor(sampleRate / ANALYSIS_RATE))
  const rate = sampleRate / factor
  const decimated = decimate(samples, factor)
  if (!isVoiced(decimated, rate)) {
    return undefined
  }
  const formants = fitFormants(windowed(decimated), rate, LPC_ORDER)
  if (sampleRate <= rate) {
    return formants
  }
  const pitch = estimatePitch(decimated, rate)
  const nearPitch =
    formants !== undefined && pitch !== undefined && formants[0] < pitch * FUNDAMENTAL_RANGE
  const uncertain =
    formants === undefined ||
    (pitch !== undefined &&
      pitch >= REFINEMENT_PITCH &&
      formants[0] < HIGHEST_PITCH * FUNDAMENTAL_RANGE &&
      Math.max(...weighVowels(formants)) < FORMANT_CONFIDENCE)
  if (!nearPitch && !uncertain) {
    return formants
  }
  // A first resonance following pitch can be the source harmonic rather than the vowel.
  // Do not reuse it if the wider spectrum cannot resolve a replacement.
  return refineFormants(samples, sampleRate) ?? (nearPitch ? undefined : formants)
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
