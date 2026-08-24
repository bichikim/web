import type {PViseme} from './index'

export interface PAudioEnvelope {
  readonly frameDurationMs: number
  readonly levels: ReadonlyArray<number>
}

export interface CreatePAudioEnvelopeOptions {
  readonly sampleRate: number
  readonly samples: Float32Array
}

export interface PVisemeDriver {
  readonly reset: () => void
  readonly update: (frame: PVisemeDriverFrame) => PViseme
}

export interface PVisemeDriverFrame {
  readonly currentTimeMs: number
  readonly intensity: number
  readonly viseme: PViseme
}

const ATTACK_DURATION_MS = 50
const RELEASE_DURATION_MS = 140
const DEFAULT_FRAME_DURATION_MS = 16
const ENVELOPE_FRAME_DURATION_MS = 20
const ENVELOPE_WINDOW_DURATION_MS = 40
const MILLISECONDS_PER_SECOND = 1000
const INITIAL_VISEME_HOLD_MS = 120
const SETTLED_VISEME_HOLD_MS = 180
const REST_THRESHOLD = 0.14
const FULL_SHAPE_ENTER_THRESHOLD = 0.55
const FULL_SHAPE_EXIT_THRESHOLD = 0.32
const PEAK_REFERENCE_PERCENTILE = 0.9
const REFERENCE_FLOOR = 0.000_1
const SILENCE_FLOOR_RATIO = 0.08
const PCM_16_SCALE = 32_768
const RIFF_HEADER_SIZE = 12
const CHUNK_HEADER_SIZE = 8
const FORMAT_CHUNK_MINIMUM_SIZE = 16
const PCM_FORMAT = 1
const MONO_CHANNEL_COUNT = 1
const PCM_16_BITS = 16

const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

const getRootMeanSquare = (samples: Float32Array, start: number, end: number) => {
  let squareTotal = 0

  for (let index = start; index < end; index += 1) {
    const sample = samples[index] ?? 0
    squareTotal += sample * sample
  }

  return end > start ? Math.sqrt(squareTotal / (end - start)) : 0
}

const getPeakReference = (levels: ReadonlyArray<number>) => {
  const sortedLevels = [...levels].sort((first, second) => first - second)
  const percentileIndex = Math.max(
    0,
    Math.min(sortedLevels.length - 1, Math.floor(sortedLevels.length * PEAK_REFERENCE_PERCENTILE)),
  )

  return Math.max(REFERENCE_FLOOR, sortedLevels[percentileIndex] ?? 0)
}

/** Precomputes a volume envelope so animation frames do not scan raw PCM repeatedly. */
export const createPAudioEnvelope = (options: CreatePAudioEnvelopeOptions): PAudioEnvelope => {
  if (options.sampleRate <= 0 || options.samples.length === 0) {
    return {frameDurationMs: ENVELOPE_FRAME_DURATION_MS, levels: []}
  }

  const frameSamples = Math.max(
    1,
    Math.round((options.sampleRate * ENVELOPE_FRAME_DURATION_MS) / MILLISECONDS_PER_SECOND),
  )
  const windowSamples = Math.max(
    frameSamples,
    Math.round((options.sampleRate * ENVELOPE_WINDOW_DURATION_MS) / MILLISECONDS_PER_SECOND),
  )
  const rawLevels: number[] = []

  for (let start = 0; start < options.samples.length; start += frameSamples) {
    const end = Math.min(options.samples.length, start + windowSamples)
    rawLevels.push(getRootMeanSquare(options.samples, start, end))
  }

  const peakReference = getPeakReference(rawLevels)
  const silenceFloor = peakReference * SILENCE_FLOOR_RATIO
  const audibleRange = Math.max(REFERENCE_FLOOR, peakReference - silenceFloor)

  return {
    frameDurationMs: ENVELOPE_FRAME_DURATION_MS,
    levels: rawLevels.map((level) => clampUnit((level - silenceFloor) / audibleRange)),
  }
}

export const getPAudioEnvelopeLevel = (envelope: PAudioEnvelope, currentTimeMs: number) => {
  if (currentTimeMs < 0 || envelope.levels.length === 0) {
    return 0
  }

  const framePosition = currentTimeMs / envelope.frameDurationMs
  const firstIndex = Math.floor(framePosition)
  const firstLevel = envelope.levels[firstIndex]

  if (firstLevel === undefined) {
    return 0
  }

  const nextLevel = envelope.levels[firstIndex + 1] ?? firstLevel
  const progress = framePosition - firstIndex
  return firstLevel + (nextLevel - firstLevel) * progress
}

const readText = (view: DataView, offset: number, length: number) => {
  let text = ''

  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(view.getUint8(offset + index))
  }

  return text
}

/** Reads the mono PCM WAV files emitted by Pomo without involving a second audio decoder. */
// oxlint-disable no-magic-numbers -- Byte offsets are defined by the PCM WAV specification.
export const createPWaveEnvelope = (buffer: ArrayBuffer): PAudioEnvelope | null => {
  if (buffer.byteLength < RIFF_HEADER_SIZE) {
    return null
  }

  const view = new DataView(buffer)

  if (readText(view, 0, 4) !== 'RIFF' || readText(view, 8, 4) !== 'WAVE') {
    return null
  }

  let format: {readonly sampleRate: number} | null = null
  let dataOffset = 0
  let dataSize = 0
  let offset = RIFF_HEADER_SIZE

  while (offset + CHUNK_HEADER_SIZE <= buffer.byteLength) {
    const chunkId = readText(view, offset, 4)
    const chunkSize = view.getUint32(offset + 4, true)
    const chunkDataOffset = offset + CHUNK_HEADER_SIZE
    const chunkEnd = chunkDataOffset + chunkSize

    if (chunkEnd > buffer.byteLength) {
      return null
    }

    if (chunkId === 'fmt ' && chunkSize >= FORMAT_CHUNK_MINIMUM_SIZE) {
      const audioFormat = view.getUint16(chunkDataOffset, true)
      const channelCount = view.getUint16(chunkDataOffset + 2, true)
      const sampleRate = view.getUint32(chunkDataOffset + 4, true)
      const bitsPerSample = view.getUint16(chunkDataOffset + 14, true)

      if (
        audioFormat !== PCM_FORMAT ||
        channelCount !== MONO_CHANNEL_COUNT ||
        bitsPerSample !== PCM_16_BITS
      ) {
        return null
      }

      format = {sampleRate}
    }

    if (chunkId === 'data') {
      dataOffset = chunkDataOffset
      dataSize = chunkSize
    }

    offset = chunkEnd + (chunkSize % 2)
  }

  if (format === null || dataSize === 0) {
    return null
  }

  const samples = new Float32Array(Math.floor(dataSize / 2))

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(dataOffset + index * 2, true) / PCM_16_SCALE
  }

  return createPAudioEnvelope({sampleRate: format.sampleRate, samples})
}
// oxlint-enable no-magic-numbers

const smoothIntensity = (current: number, target: number, elapsedMs: number) => {
  const durationMs = target > current ? ATTACK_DURATION_MS : RELEASE_DURATION_MS
  const progress = 1 - Math.exp(-elapsedMs / durationMs)
  return current + (target - current) * progress
}

/** Smooths PCM volume and limits hard mouth swaps to a natural animation cadence. */
export const createPVisemeDriver = (): PVisemeDriver => {
  let activeViseme: PViseme = 'rest'
  let hasFullShape = false
  let hasSettledSpeechShape = false
  let intensity = 0
  let lastChangeMs = Number.NEGATIVE_INFINITY
  let previousTimeMs: number | null = null

  const reset = () => {
    activeViseme = 'rest'
    hasFullShape = false
    hasSettledSpeechShape = false
    intensity = 0
    lastChangeMs = Number.NEGATIVE_INFINITY
    previousTimeMs = null
  }

  const update = (frame: PVisemeDriverFrame) => {
    const elapsedMs =
      previousTimeMs === null || frame.currentTimeMs < previousTimeMs
        ? DEFAULT_FRAME_DURATION_MS
        : Math.max(1, frame.currentTimeMs - previousTimeMs)
    previousTimeMs = frame.currentTimeMs
    intensity = smoothIntensity(intensity, clampUnit(frame.intensity), elapsedMs)
    let nextViseme = frame.viseme

    if (frame.viseme === 'closed') {
      nextViseme = 'closed'
    } else if (intensity < REST_THRESHOLD) {
      hasFullShape = false
      hasSettledSpeechShape = false
      nextViseme = 'rest'
    } else if (frame.viseme === 'rest') {
      nextViseme = activeViseme === 'rest' ? 'narrow' : activeViseme
    } else {
      hasFullShape = hasFullShape
        ? intensity >= FULL_SHAPE_EXIT_THRESHOLD
        : intensity >= FULL_SHAPE_ENTER_THRESHOLD
      nextViseme = hasFullShape ? frame.viseme : 'narrow'
    }

    const minimumHoldMs = hasSettledSpeechShape ? SETTLED_VISEME_HOLD_MS : INITIAL_VISEME_HOLD_MS

    if (
      nextViseme !== activeViseme &&
      (nextViseme === 'rest' || frame.currentTimeMs - lastChangeMs >= minimumHoldMs)
    ) {
      activeViseme = nextViseme
      lastChangeMs = frame.currentTimeMs
      hasSettledSpeechShape ||=
        activeViseme === 'open' || activeViseme === 'wide' || activeViseme === 'round'
    }

    return activeViseme
  }

  return {reset, update}
}
