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
/** Web Audio's `createBuffer` limits; files outside them could not play. */
const MAX_CHANNELS = 32
const SAMPLE_RATE_RANGE = {maximum: 768_000, minimum: 3000} as const

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

/** A WAV file's playable format and length, read from its `fmt ` and `data` chunk headers. */
export interface WavHeader {
  readonly bits: number
  readonly channels: number
  /** Byte offset of the first sample frame. */
  readonly dataOffset: number
  /** Seconds of whole sample frames, `frames / sampleRate`. */
  readonly duration: number
  /** `FLOAT` (3) or `PCM` (1), after resolving `WAVE_FORMAT_EXTENSIBLE`. */
  readonly encoding: number
  /** Whole sample frames in the (possibly truncated) data chunk. */
  readonly frames: number
  readonly sampleRate: number
}

export type ReadWavHeaderResult =
  | {readonly header: WavHeader; readonly ok: true}
  | {readonly error: DecodeWavError; readonly ok: false}

const toView = (bytes: ArrayBuffer | Uint8Array) =>
  bytes instanceof Uint8Array
    ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    : new DataView(bytes)

const readHeader = (view: DataView): ReadWavHeaderResult => {
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
  if (
    format.channels > MAX_CHANNELS ||
    format.sampleRate < SAMPLE_RATE_RANGE.minimum ||
    format.sampleRate > SAMPLE_RATE_RANGE.maximum
  ) {
    return {error: 'unsupported-encoding', ok: false}
  }
  if (chunks.data === undefined) {
    return {error: 'missing-data', ok: false}
  }
  const frames = Math.floor(chunks.data.size / ((format.bits / BITS_PER_BYTE) * format.channels))
  return {
    header: {
      ...format,
      dataOffset: chunks.data.offset,
      duration: frames / format.sampleRate,
      frames,
    },
    ok: true,
  }
}

/**
 * Reads a WAV file's format and length without decoding its samples. It accepts and rejects
 * exactly the files `decodeWav` does, with the same errors.
 */
export const readWavHeader = (bytes: ArrayBuffer | Uint8Array): ReadWavHeaderResult =>
  readHeader(toView(bytes))

/**
 * Decodes a linear PCM (8-bit unsigned, 16/24/32-bit signed) or 32-bit float WAV file,
 * including `WAVE_FORMAT_EXTENSIBLE`. A truncated data chunk keeps its whole sample frames.
 */
export const decodeWav = (bytes: ArrayBuffer | Uint8Array): DecodeWavResult => {
  const view = toView(bytes)
  const result = readHeader(view)
  if (!result.ok) {
    return result
  }
  const {header} = result
  const sampleBytes = header.bits / BITS_PER_BYTE
  const frameBytes = sampleBytes * header.channels
  const length = header.frames
  const read = sampleReader(view, header)
  const start = header.dataOffset
  const channels = Array.from({length: header.channels}, (_, channel) =>
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
  return {ok: true, sound: {channels, mono, sampleRate: header.sampleRate}}
}
