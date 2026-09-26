import {clampUnit} from 'src/utils/clamp-unit'
import {clamp} from 'es-toolkit/math'
// oxlint-disable no-magic-numbers -- Shared PCM layout and audio-connection policy.

export const DEFAULT_CONNECTION_SECONDS = 4
export const MIN_CONNECTION_SECONDS = 0
export const MIN_AI_CONNECTION_SECONDS = 1
export const MAX_GENERATION_CONNECTION_SECONDS = 59
export const MAX_AI_CONNECTION_SECONDS = 10
export const CONNECTION_CONTEXT_SECONDS = 6
export const CONNECTION_WINDOW_SECONDS = CONNECTION_CONTEXT_SECONDS * 2
export const SAMPLE_RATE = 44100
export const STEREO_FRAME_BYTES = 4
export const WAV_HEADER_BYTES = 44
export const PCM16_SCALE = 32768
export const EDGE_RAMP_SECONDS = 0.2
const MAX_PCM16_SAMPLE = PCM16_SCALE - 1
const MIN_PCM_RMS = 1 / PCM16_SCALE
const MAX_LEVEL_GAIN = 2
const CROSSFADE_QUARTER_TURN = Math.PI / 2

export type PcmBlendDirection = 'generated-to-original' | 'original-to-generated'

export interface PcmCrossfadeOptions {
  readonly next: ArrayBuffer
  readonly previous: ArrayBuffer
}

export interface CreatePcmLevelMatchedBufferOptions {
  readonly reference: ArrayBuffer
  readonly source: ArrayBuffer
  readonly sourceMatch: ArrayBuffer
}

export interface PcmEdgeBlendOptions {
  readonly direction: PcmBlendDirection
  readonly generated: ArrayBuffer
  readonly generatedStartFrame: number
  readonly original: ArrayBuffer
  readonly rampFrames: number
}

/** Crossfades two same-length stereo PCM16 buffers with an equal-power curve. */
export function createPcmCrossfade(options: PcmCrossfadeOptions): ArrayBuffer {
  const {next, previous} = options
  validatePcmPair(previous, next)
  const frames = previous.byteLength / STEREO_FRAME_BYTES
  const result = new ArrayBuffer(previous.byteLength)
  const previousView = new DataView(previous)
  const nextView = new DataView(next)
  const resultView = new DataView(result)
  for (let frame = 0; frame < frames; frame += 1) {
    const progress = frames === 1 ? 1 : frame / (frames - 1)
    const previousWeight = Math.cos(progress * CROSSFADE_QUARTER_TURN)
    const nextWeight = Math.sin(progress * CROSSFADE_QUARTER_TURN)
    for (let channel = 0; channel < 2; channel += 1) {
      const offset = frame * STEREO_FRAME_BYTES + channel * 2
      const previousSample = previousView.getInt16(offset, true)
      const nextSample = nextView.getInt16(offset, true)
      resultView.setInt16(
        offset,
        Math.round(previousSample * previousWeight + nextSample * nextWeight),
        true,
      )
    }
  }
  return result
}

/** Scales a stereo PCM16 source toward a reference RMS without exceeding PCM16 headroom. */
export function createPcmLevelMatchedBuffer(
  options: CreatePcmLevelMatchedBufferOptions,
): ArrayBuffer {
  const {reference, source, sourceMatch} = options
  validatePcmBuffer(reference)
  validatePcmBuffer(sourceMatch)
  validatePcmBuffer(source)

  const referenceRms = calculatePcmStatistics(reference).rms
  const sourceMatchStatistics = calculatePcmStatistics(sourceMatch)
  const sourcePeak = calculatePcmStatistics(source).peak
  const requestedGain =
    referenceRms > MIN_PCM_RMS && sourceMatchStatistics.rms > MIN_PCM_RMS
      ? referenceRms / sourceMatchStatistics.rms
      : 1
  const clippingGain =
    sourcePeak === 0 ? Number.POSITIVE_INFINITY : MAX_PCM16_SAMPLE / (PCM16_SCALE * sourcePeak)
  const gain = Math.min(MAX_LEVEL_GAIN, requestedGain, clippingGain)

  return applyPcmGain(source, gain)
}

/** Blends a generated connection patch into an original edge using one shared linear ramp. */
export function createPcmEdgeBlend(options: PcmEdgeBlendOptions): ArrayBuffer {
  const {direction, generated, generatedStartFrame, original, rampFrames} = options
  if (
    !Number.isInteger(generatedStartFrame) ||
    generatedStartFrame < 0 ||
    !Number.isInteger(rampFrames) ||
    rampFrames < 1
  ) {
    throw new Error('오디오 연결 계산에 필요한 프레임 위치가 올바르지 않습니다.')
  }
  if (original.byteLength % STEREO_FRAME_BYTES !== 0) {
    throw new Error('원본 오디오가 스테레오 PCM16 프레임으로 정렬되지 않았습니다.')
  }
  const frames = original.byteLength / STEREO_FRAME_BYTES
  const generatedEndFrame = generatedStartFrame + frames
  if (
    generated.byteLength % STEREO_FRAME_BYTES !== 0 ||
    generatedEndFrame > generated.byteLength / STEREO_FRAME_BYTES
  ) {
    throw new Error('생성된 연결음에 필요한 프레임이 부족합니다.')
  }
  const result = original.slice(0)
  const originalView = new DataView(original)
  const generatedView = new DataView(generated)
  const resultView = new DataView(result)
  for (let frame = 0; frame < frames; frame += 1) {
    const generatedWeight =
      direction === 'generated-to-original'
        ? clampUnit((frames - 1 - frame) / rampFrames)
        : clampUnit(frame / rampFrames)
    for (let channel = 0; channel < 2; channel += 1) {
      const offset = frame * STEREO_FRAME_BYTES + channel * 2
      const generatedOffset = (generatedStartFrame + frame) * STEREO_FRAME_BYTES + channel * 2
      const originalSample = originalView.getInt16(offset, true)
      const generatedSample = generatedView.getInt16(generatedOffset, true)
      resultView.setInt16(
        offset,
        Math.round(originalSample * (1 - generatedWeight) + generatedSample * generatedWeight),
        true,
      )
    }
  }
  return result
}

function validatePcmPair(previous: ArrayBuffer, next: ArrayBuffer): void {
  if (
    previous.byteLength === 0 ||
    previous.byteLength !== next.byteLength ||
    previous.byteLength % STEREO_FRAME_BYTES !== 0
  ) {
    throw new Error('연결할 오디오가 같은 길이의 스테레오 PCM16 프레임이어야 합니다.')
  }
}

function validatePcmBuffer(buffer: ArrayBuffer): void {
  if (buffer.byteLength === 0 || buffer.byteLength % STEREO_FRAME_BYTES !== 0) {
    throw new Error('오디오가 스테레오 PCM16 프레임으로 정렬되지 않았습니다.')
  }
}

interface PcmStatistics {
  readonly peak: number
  readonly rms: number
}

function calculatePcmStatistics(buffer: ArrayBuffer): PcmStatistics {
  validatePcmBuffer(buffer)
  const view = new DataView(buffer)
  let sumOfSquares = 0
  let peak = 0
  for (let offset = 0; offset < buffer.byteLength; offset += 2) {
    const sample = view.getInt16(offset, true)
    const normalizedSample = sample / PCM16_SCALE
    sumOfSquares += normalizedSample * normalizedSample
    peak = Math.max(peak, Math.abs(normalizedSample))
  }
  return {
    peak,
    rms: Math.sqrt(sumOfSquares / (buffer.byteLength / 2)),
  }
}

function applyPcmGain(source: ArrayBuffer, gain: number): ArrayBuffer {
  const result = source.slice(0)
  if (gain === 1) {
    return result
  }

  const sourceView = new DataView(source)
  const resultView = new DataView(result)
  for (let offset = 0; offset < source.byteLength; offset += 2) {
    const sample = sourceView.getInt16(offset, true)
    const scaledSample = Math.round(sample * gain)
    resultView.setInt16(offset, clamp(scaledSample, -PCM16_SCALE, MAX_PCM16_SAMPLE), true)
  }
  return result
}
