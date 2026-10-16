/** A decoded WAV file: per-channel samples in -1..1 and their mono mix for analysis. */
export interface PuppetSound {
  readonly channels: ReadonlyArray<Float32Array<ArrayBuffer>>
  /** Average of the channels (Cubism's analysis also mixes stereo down). */
  readonly mono: Float32Array<ArrayBuffer>
  readonly sampleRate: number
}

export type DecodeWavError =
  | 'not-wav'
  | 'missing-format'
  | 'missing-data'
  | 'unsupported-encoding'
  | 'invalid-format'

export type DecodeWavResult =
  | {readonly ok: true; readonly sound: PuppetSound}
  | {readonly error: DecodeWavError; readonly ok: false}

const RIFF_HEADER = 12
const CHUNK_HEADER = 8
const FORMAT_MINIMUM = 16
const EXTENSIBLE_MINIMUM = 26
const EXTENSIBLE_SUBFORMAT_OFFSET = 24
const PCM = 1
const FLOAT = 3
const EXTENSIBLE = 0xfffe
const BITS_PER_BYTE = 8
const BITS_16 = 16
const BITS_24 = 24
const BITS_32 = 32
const PCM_BITS = [BITS_PER_BYTE, BITS_16, BITS_24, BITS_32]
const UNSIGNED_8_BIT_MIDDLE = 128
const SIXTEEN_BIT_RANGE = 2 ** BITS_16
/** Full scale of a signed sample of `bits`. */
const fullScale = (bits: number) => 2 ** (bits - 1)
const TAG_LENGTH = 4
const SIZE_OFFSET = 4
const WAVE_TAG_OFFSET = 8
/** Offsets inside the `fmt ` chunk body. */
const FORMAT = {bits: 14, channels: 2, sampleRate: 4} as const

interface WavFormat {
  readonly bits: number
  readonly channels: number
  readonly encoding: number
  readonly sampleRate: number
}

const tag = (view: DataView, offset: number) =>
  String.fromCodePoint(
    ...Array.from({length: TAG_LENGTH}, (_, index) => view.getUint8(offset + index)),
  )

const readFormat = (view: DataView, offset: number, size: number): WavFormat | undefined => {
  if (size < FORMAT_MINIMUM) {
    return undefined
  }
  const tagValue = view.getUint16(offset, true)
  const encoding =
    tagValue === EXTENSIBLE && size >= EXTENSIBLE_MINIMUM
      ? view.getUint16(offset + EXTENSIBLE_SUBFORMAT_OFFSET, true)
      : tagValue
  return {
    bits: view.getUint16(offset + FORMAT.bits, true),
    channels: view.getUint16(offset + FORMAT.channels, true),
    encoding,
    sampleRate: view.getUint32(offset + FORMAT.sampleRate, true),
  }
}

/** Reads one sample at `offset` as -1..1 (exactly representable in 32-bit float up to 24 bits). */
const sampleReader = (view: DataView, format: WavFormat) => {
  if (format.encoding === FLOAT) {
    return (offset: number) => view.getFloat32(offset, true)
  }
  const scale = fullScale(format.bits)
  switch (format.bits) {
    case BITS_PER_BYTE:
      return (offset: number) =>
        (view.getUint8(offset) - UNSIGNED_8_BIT_MIDDLE) / UNSIGNED_8_BIT_MIDDLE
    case BITS_16:
      return (offset: number) => view.getInt16(offset, true) / scale
    case BITS_24:
      return (offset: number) => {
        const unsigned =
          view.getUint16(offset, true) + view.getUint8(offset + 2) * SIXTEEN_BIT_RANGE
        return (unsigned >= scale ? unsigned - 2 * scale : unsigned) / scale
      }
    default:
      return (offset: number) => view.getInt32(offset, true) / scale
  }
}

const isSupported = (format: WavFormat) =>
  (format.encoding === PCM && PCM_BITS.includes(format.bits)) ||
  (format.encoding === FLOAT && format.bits === BITS_32)

/** The `fmt ` and `data` chunks' positions; chunks are word aligned. */
const findChunks = (view: DataView) => {
  let format: {offset: number; size: number} | undefined
  let data: {offset: number; size: number} | undefined
  let offset = RIFF_HEADER
  while (offset + CHUNK_HEADER <= view.byteLength) {
    const size = view.getUint32(offset + SIZE_OFFSET, true)
    const body = offset + CHUNK_HEADER
    const chunk = {offset: body, size: Math.min(size, view.byteLength - body)}
    const id = tag(view, offset)
    if (id === 'fmt ') {
      format ??= chunk
    } else if (id === 'data') {
      data ??= chunk
    }
    offset = body + size + (size % 2)
  }
  return {data, format}
}

/**
 * Decodes a linear PCM (8-bit unsigned, 16/24/32-bit signed) or 32-bit float WAV file,
 * including `WAVE_FORMAT_EXTENSIBLE`. A truncated data chunk keeps its whole sample frames.
 */
export const decodeWav = (bytes: ArrayBuffer | Uint8Array): DecodeWavResult => {
  const view =
    bytes instanceof Uint8Array
      ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : new DataView(bytes)
  if (
    view.byteLength < RIFF_HEADER ||
    tag(view, 0) !== 'RIFF' ||
    tag(view, WAVE_TAG_OFFSET) !== 'WAVE'
  ) {
    return {error: 'not-wav', ok: false}
  }
  const chunks = findChunks(view)
  const format =
    chunks.format === undefined
      ? undefined
      : readFormat(view, chunks.format.offset, chunks.format.size)
  if (format === undefined) {
    return {error: 'missing-format', ok: false}
  }
  if (!isSupported(format)) {
    return {error: 'unsupported-encoding', ok: false}
  }
  if (format.channels === 0 || format.sampleRate === 0) {
    return {error: 'invalid-format', ok: false}
  }
  if (chunks.data === undefined) {
    return {error: 'missing-data', ok: false}
  }
  const sampleBytes = format.bits / BITS_PER_BYTE
  const frameBytes = sampleBytes * format.channels
  const length = Math.floor(chunks.data.size / frameBytes)
  const read = sampleReader(view, format)
  const start = chunks.data.offset
  const channels = Array.from({length: format.channels}, (_, channel) =>
    Float32Array.from({length}, (_, frame) =>
      read(start + frame * frameBytes + channel * sampleBytes),
    ),
  )
  const mono =
    channels.length === 1
      ? channels[0]!
      : Float32Array.from(
          {length},
          (_, frame) =>
            channels.reduce((sum, channel) => sum + channel[frame]!, 0) / channels.length,
        )
  return {ok: true, sound: {channels, mono, sampleRate: format.sampleRate}}
}
