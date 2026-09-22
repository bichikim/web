// oxlint-disable no-magic-numbers -- WAV offsets and PCM ranges are fixed by the audio format.

import {RunnerExecutionError} from './errors.ts'

const MINIMUM_SAMPLE_RATE = 8000
const MAXIMUM_RESAMPLED_BYTES = 64 * 1024 * 1024

export interface DecodedAudio {
  readonly sampleRate: number
  readonly samples: Float32Array
}

const clampSample = (value: number): number => Math.max(-1, Math.min(1, value))

const readAscii = (view: DataView, offset: number, length: number): string => {
  let value = ''
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index))
  }
  return value
}

const getWavChunk = (
  view: DataView,
  target: string,
  start: number,
): {readonly dataOffset: number; readonly size: number} | null => {
  let offset = start
  while (offset + 8 <= view.byteLength) {
    const chunkId = readAscii(view, offset, 4)
    const size = view.getUint32(offset + 4, true)
    const dataOffset = offset + 8
    if (chunkId === target) {
      return {dataOffset, size}
    }
    offset = dataOffset + size + (size % 2)
  }
  return null
}

export const decodePcmWav = (bytes: Uint8Array): DecodedAudio => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (
    view.byteLength < 12 ||
    readAscii(view, 0, 4) !== 'RIFF' ||
    readAscii(view, 8, 4) !== 'WAVE'
  ) {
    throw new RunnerExecutionError(
      'invalid-audio',
      'Only RIFF/WAVE audio is supported by the runner',
    )
  }

  const format = getWavChunk(view, 'fmt ', 12)
  const data = getWavChunk(view, 'data', 12)
  if (format === null || data === null || format.size < 16 || data.size < 2) {
    throw new RunnerExecutionError('invalid-audio', 'The WAV file is missing PCM format data')
  }

  const audioFormat = view.getUint16(format.dataOffset, true)
  const channels = view.getUint16(format.dataOffset + 2, true)
  const sampleRate = view.getUint32(format.dataOffset + 4, true)
  const bitsPerSample = view.getUint16(format.dataOffset + 14, true)
  if (audioFormat !== 1 || channels < 1 || bitsPerSample !== 16 || sampleRate < 1) {
    throw new RunnerExecutionError(
      'invalid-audio',
      'The runner accepts only uncompressed 16-bit PCM WAV input',
    )
  }

  if (sampleRate < MINIMUM_SAMPLE_RATE) {
    throw new RunnerExecutionError('invalid-audio', 'The WAV sample rate must be at least 8000 Hz')
  }

  const frameSize = channels * 2
  const frameCount = Math.floor(Math.min(data.size, view.byteLength - data.dataOffset) / frameSize)
  const samples = new Float32Array(frameCount)
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0
    for (let channel = 0; channel < channels; channel += 1) {
      sum += view.getInt16(data.dataOffset + frame * frameSize + channel * 2, true) / 32_768
    }
    samples[frame] = sum / channels
  }

  return {sampleRate, samples}
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

export const createWaveBuffer = (samples: Float32Array, sampleRate: number): Uint8Array => {
  const headerSize = 44
  const buffer = new ArrayBuffer(headerSize + samples.length * 2)
  const view = new DataView(buffer)
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeText(0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = clampSample(samples[index] ?? 0)
    view.setInt16(headerSize + index * 2, sample < 0 ? sample * 32_768 : sample * 32_767, true)
  }
  return new Uint8Array(buffer)
}
