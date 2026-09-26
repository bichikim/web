// oxlint-disable no-magic-numbers -- RIFF chunk offsets and PCM16 scaling are format constants.
interface DecodedPcm16Wave {
  readonly channels: number
  readonly sampleRate: number
  readonly samples: Float32Array
}
interface WaveDecodeOptions {
  readonly truncatedData?: 'reject' | 'read-available'
}
interface WaveChunk {
  readonly offset: number
  readonly size: number
}
const readText = (view: DataView, offset: number) =>
  String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, 4))

const readPcmChunks = (view: DataView, options: WaveDecodeOptions) => {
  let format: WaveChunk | null = null
  let data: WaveChunk | null = null
  let offset = 12
  while (offset + 8 <= view.byteLength) {
    const kind = readText(view, offset)
    const size = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (
      start + size > view.byteLength &&
      !(kind === 'data' && options.truncatedData === 'read-available')
    ) {
      return null
    }
    if (kind === 'fmt ' && format === null) {
      format = {offset: start, size}
    }
    if (kind === 'data' && data === null) {
      data = {offset: start, size: Math.min(size, view.byteLength - start)}
    }
    offset = start + size + (size % 2)
  }
  return format === null || format.size < 16 || data === null || data.size < 2
    ? null
    : {data, format}
}

/** Decodes PCM16 WAV to mono samples, averaging channels and honoring the truncation policy. */
export const decodePcm16Wav = (
  bytes: ArrayBuffer | Uint8Array,
  options: WaveDecodeOptions = {},
): DecodedPcm16Wave | null => {
  const view =
    bytes instanceof Uint8Array
      ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : new DataView(bytes)
  if (view.byteLength < 12 || readText(view, 0) !== 'RIFF' || readText(view, 8) !== 'WAVE') {
    return null
  }
  const chunks = readPcmChunks(view, options)
  if (chunks === null) {
    return null
  }
  const {data, format} = chunks
  const channels = view.getUint16(format.offset + 2, true)
  const sampleRate = view.getUint32(format.offset + 4, true)
  if (
    view.getUint16(format.offset, true) !== 1 ||
    channels < 1 ||
    sampleRate < 1 ||
    view.getUint16(format.offset + 14, true) !== 16
  ) {
    return null
  }
  const samples = new Float32Array(Math.floor(data.size / (channels * 2)))
  for (let frame = 0; frame < samples.length; frame += 1) {
    let sum = 0
    for (let channel = 0; channel < channels; channel += 1) {
      sum += view.getInt16(data.offset + (frame * channels + channel) * 2, true) / 32_768
    }
    samples[frame] = sum / channels
  }
  return {channels, sampleRate, samples}
}
