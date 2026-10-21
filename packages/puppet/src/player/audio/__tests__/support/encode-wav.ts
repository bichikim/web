/** Bits per integer sample. */
type Bits = 8 | 16 | 24 | 32 // eslint-disable-line no-magic-numbers -- the WAV sample sizes

export interface EncodeWavOptions {
  readonly bits?: Bits
  /** Per-channel samples in -1..1. */
  readonly channels: ReadonlyArray<ArrayLike<number>>
  /** Chunks written before `fmt `, such as an odd-sized `LIST`, to exercise chunk walking. */
  readonly extraChunks?: ReadonlyArray<{readonly id: string; readonly size: number}>
  readonly extensible?: boolean
  readonly float?: boolean
  readonly sampleRate: number
}

const RIFF_HEADER = 12
const CHUNK_HEADER = 8
const FORMAT_SIZE = 16
const EXTENSIBLE_FORMAT_SIZE = 40
const EXTENSION_SIZE = 22
const PCM = 1
const FLOAT = 3
const EXTENSIBLE = 0xff_fe
const BITS_PER_BYTE = 8
const DEFAULT_BITS = 16
const FLOAT_BITS = 32
const BYTE_RANGE = 256
const SIXTEEN_BIT_RANGE = BYTE_RANGE * BYTE_RANGE
const UNSIGNED_MIDDLE = 128
const TWENTY_FOUR_BITS = 24
/** Offsets inside the `fmt ` chunk body. */
const FORMAT = {
  bits: 14,
  blockAlign: 12,
  byteRate: 8,
  channels: 2,
  extension: 16,
  sampleRate: 4,
  subformat: 24,
  validBits: 18,
} as const

const padded = (size: number) => size + (size % 2)

const writeTag = (view: DataView, offset: number, tag: string) => {
  for (const [index, character] of [...tag].entries()) {
    view.setUint8(offset + index, character.codePointAt(0)!)
  }
}

/** The sample as a two's-complement integer of `bits`, rounded and clamped. */
const toInteger = (value: number, bits: Bits) => {
  const scale = 2 ** (bits - 1)
  return Math.min(scale - 1, Math.max(-scale, Math.round(value * scale)))
}

const writeSample = (view: DataView, offset: number, value: number, options: EncodeWavOptions) => {
  const bits = options.bits ?? DEFAULT_BITS
  if (options.float === true) {
    view.setFloat32(offset, value, true)
  } else if (bits === BITS_PER_BYTE) {
    view.setUint8(offset, toInteger(value, bits) + UNSIGNED_MIDDLE)
  } else if (bits === DEFAULT_BITS) {
    view.setInt16(offset, toInteger(value, bits), true)
  } else if (bits === TWENTY_FOUR_BITS) {
    const integer = toInteger(value, bits)
    const unsigned = integer < 0 ? integer + 2 ** TWENTY_FOUR_BITS : integer
    view.setUint16(offset, unsigned % SIXTEEN_BIT_RANGE, true)
    view.setUint8(offset + 2, Math.floor(unsigned / SIXTEEN_BIT_RANGE))
  } else {
    view.setInt32(offset, toInteger(value, bits), true)
  }
}

/** Writes the `fmt ` chunk at `offset` and returns the offset after it. */
const writeFormat = (view: DataView, offset: number, options: EncodeWavOptions, bits: number) => {
  const extensible = options.extensible === true
  const size = extensible ? EXTENSIBLE_FORMAT_SIZE : FORMAT_SIZE
  const encoding = options.float === true ? FLOAT : PCM
  const blockAlign = options.channels.length * (bits / BITS_PER_BYTE)
  const body = offset + CHUNK_HEADER
  writeTag(view, offset, 'fmt ')
  view.setUint32(offset + CHUNK_HEADER / 2, size, true)
  view.setUint16(body, extensible ? EXTENSIBLE : encoding, true)
  view.setUint16(body + FORMAT.channels, options.channels.length, true)
  view.setUint32(body + FORMAT.sampleRate, options.sampleRate, true)
  view.setUint32(body + FORMAT.byteRate, options.sampleRate * blockAlign, true)
  view.setUint16(body + FORMAT.blockAlign, blockAlign, true)
  view.setUint16(body + FORMAT.bits, bits, true)
  if (extensible) {
    view.setUint16(body + FORMAT.extension, EXTENSION_SIZE, true)
    view.setUint16(body + FORMAT.validBits, bits, true)
    view.setUint16(body + FORMAT.subformat, encoding, true)
  }
  return body + size
}

/** A WAV file of the samples, quantized to integers (rounded, clamped) unless `float`. */
export const encodeWav = (options: EncodeWavOptions): Uint8Array => {
  const bits = options.float === true ? FLOAT_BITS : (options.bits ?? DEFAULT_BITS)
  const length = options.channels[0]?.length ?? 0
  const sampleBytes = bits / BITS_PER_BYTE
  const extra = options.extraChunks ?? []
  const extraBytes = extra.reduce((sum, chunk) => sum + CHUNK_HEADER + padded(chunk.size), 0)
  const formatSize = options.extensible === true ? EXTENSIBLE_FORMAT_SIZE : FORMAT_SIZE
  const dataSize = length * options.channels.length * sampleBytes
  const total = RIFF_HEADER + extraBytes + 2 * CHUNK_HEADER + formatSize + dataSize
  const bytes = new Uint8Array(total)
  const view = new DataView(bytes.buffer)
  writeTag(view, 0, 'RIFF')
  view.setUint32(CHUNK_HEADER / 2, total - CHUNK_HEADER, true)
  writeTag(view, CHUNK_HEADER, 'WAVE')
  let offset = RIFF_HEADER
  for (const chunk of extra) {
    writeTag(view, offset, chunk.id)
    view.setUint32(offset + CHUNK_HEADER / 2, chunk.size, true)
    offset += CHUNK_HEADER + padded(chunk.size)
  }
  offset = writeFormat(view, offset, options, bits)
  writeTag(view, offset, 'data')
  view.setUint32(offset + CHUNK_HEADER / 2, dataSize, true)
  offset += CHUNK_HEADER
  for (let frame = 0; frame < length; frame += 1) {
    for (const channel of options.channels) {
      writeSample(view, offset, channel[frame]!, options)
      offset += sampleBytes
    }
  }
  return bytes
}
