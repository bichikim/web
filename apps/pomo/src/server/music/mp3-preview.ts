// oxlint-disable no-magic-numbers, eslint/no-bitwise -- MPEG and ID3 use fixed binary fields.
const ID3_HEADER_BYTES = 10
const ID3_FOOTER_BYTES = 10
const ID3_FOOTER_FLAG = 0x10
const MAXIMUM_ID3_BYTES = 512 * 1024
const MAXIMUM_SYNC_SEARCH_BYTES = 64 * 1024
const MAXIMUM_VBR_HEADER_OFFSET = 128
const MPEG_VERSION_1 = 0b11
const MPEG_VERSION_2 = 0b10
const MPEG_VERSION_2_5 = 0b00
const MPEG_LAYER_3 = 0b01
const FORBIDDEN_BITRATE_INDEX = 0b1111
const FORBIDDEN_SAMPLE_RATE_INDEX = 0b11
const KILOBITS_TO_BITS = 1000
const BITS_PER_BYTE = 8
const MPEG_1_FRAME_FACTOR = 144
const MPEG_2_FRAME_FACTOR = 72
const MPEG_1_SAMPLES_PER_FRAME = 1152
const MPEG_2_SAMPLES_PER_FRAME = 576
const MILLISECONDS_PER_SECOND = 1000

const MPEG_1_LAYER_3_BITRATES = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
] as const
const MPEG_2_LAYER_3_BITRATES = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
] as const
const MPEG_1_SAMPLE_RATES = [44_100, 48_000, 32_000] as const

interface Mp3Frame {
  readonly byteLength: number
  readonly durationMs: number
}

const matchesAscii = (bytes: Uint8Array, offset: number, value: string): boolean =>
  [...value].every((character, index) => bytes[offset + index] === character.codePointAt(0))

const findMarker = (
  bytes: Uint8Array,
  frameBytes: number,
  markers: readonly string[],
): number | null => {
  const maximumOffset = Math.min(bytes.byteLength, frameBytes, MAXIMUM_VBR_HEADER_OFFSET) - 4

  for (let offset = 4; offset <= maximumOffset; offset += 1) {
    if (markers.some((marker) => matchesAscii(bytes, offset, marker))) {
      return offset
    }
  }

  return null
}

const rewriteXingHeader = (bytes: Uint8Array, frameBytes: number, frameCount: number): void => {
  const markerOffset = findMarker(bytes, frameBytes, ['Xing', 'Info'])

  if (markerOffset === null || markerOffset + 8 > bytes.byteLength) {
    return
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const flags = view.getUint32(markerOffset + 4)
  let fieldOffset = markerOffset + 8

  if ((flags & 0x1) !== 0 && fieldOffset + 4 <= bytes.byteLength) {
    view.setUint32(fieldOffset, frameCount)
    fieldOffset += 4
  }

  if ((flags & 0x2) !== 0 && fieldOffset + 4 <= bytes.byteLength) {
    view.setUint32(fieldOffset, bytes.byteLength)
    fieldOffset += 4
  }

  if ((flags & 0x4) !== 0 && fieldOffset + 100 <= bytes.byteLength) {
    for (let index = 0; index < 100; index += 1) {
      bytes[fieldOffset + index] = Math.floor((index * 256) / 100)
    }
  }
}

const rewriteVbriHeader = (bytes: Uint8Array, frameBytes: number, frameCount: number): void => {
  const markerOffset = findMarker(bytes, frameBytes, ['VBRI'])

  if (markerOffset === null || markerOffset + 18 > bytes.byteLength) {
    return
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  view.setUint32(markerOffset + 10, bytes.byteLength)
  view.setUint32(markerOffset + 14, frameCount)
}

const readSynchsafeInteger = (bytes: Uint8Array, offset: number): number => {
  const first = bytes[offset]
  const second = bytes[offset + 1]
  const third = bytes[offset + 2]
  const fourth = bytes[offset + 3]

  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined ||
    (first | second | third | fourth) > 0x7f
  ) {
    throw new TypeError('invalid_mp3_id3')
  }

  return (first << 21) | (second << 14) | (third << 7) | fourth
}

const getAudioStart = (bytes: Uint8Array): number => {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return 0
  }

  if (bytes.byteLength < ID3_HEADER_BYTES) {
    throw new TypeError('invalid_mp3_id3')
  }

  const bodyBytes = readSynchsafeInteger(bytes, 6)
  const footerBytes = (bytes[5] & ID3_FOOTER_FLAG) === 0 ? 0 : ID3_FOOTER_BYTES
  const totalBytes = ID3_HEADER_BYTES + bodyBytes + footerBytes

  if (totalBytes > MAXIMUM_ID3_BYTES || totalBytes > bytes.byteLength) {
    throw new TypeError('invalid_mp3_id3')
  }

  return totalBytes
}

const getSampleRate = (version: number, sampleRateIndex: number): number => {
  const baseRate = MPEG_1_SAMPLE_RATES[sampleRateIndex]!
  if (version === MPEG_VERSION_1) {
    return baseRate
  }

  if (version === MPEG_VERSION_2) {
    return baseRate / 2
  }

  return baseRate / 4
}

const parseFrame = (bytes: Uint8Array, offset: number): Mp3Frame | null => {
  const first = bytes[offset]
  const second = bytes[offset + 1]
  const third = bytes[offset + 2]

  if (first !== 0xff || second === undefined || (second & 0xe0) !== 0xe0 || third === undefined) {
    return null
  }

  const version = (second >> 3) & 0b11
  const layer = (second >> 1) & 0b11
  const bitrateIndex = (third >> 4) & 0b1111
  const sampleRateIndex = (third >> 2) & 0b11
  const padding = (third >> 1) & 0b1

  if (
    layer !== MPEG_LAYER_3 ||
    version === 0b01 ||
    bitrateIndex === 0 ||
    bitrateIndex === FORBIDDEN_BITRATE_INDEX ||
    sampleRateIndex === FORBIDDEN_SAMPLE_RATE_INDEX
  ) {
    return null
  }

  const bitrateTable =
    version === MPEG_VERSION_1 ? MPEG_1_LAYER_3_BITRATES : MPEG_2_LAYER_3_BITRATES
  const bitrate = bitrateTable[bitrateIndex]!
  const sampleRate = getSampleRate(version, sampleRateIndex)

  const isMpeg1 = version === MPEG_VERSION_1
  const frameFactor = isMpeg1 ? MPEG_1_FRAME_FACTOR : MPEG_2_FRAME_FACTOR
  const samplesPerFrame = isMpeg1 ? MPEG_1_SAMPLES_PER_FRAME : MPEG_2_SAMPLES_PER_FRAME
  const byteLength = Math.floor((frameFactor * bitrate * KILOBITS_TO_BITS) / sampleRate) + padding

  return {
    byteLength,
    durationMs: (samplesPerFrame * MILLISECONDS_PER_SECOND) / sampleRate,
  }
}

const findFirstFrame = (bytes: Uint8Array, audioStart: number): number => {
  const searchEnd = Math.min(bytes.byteLength - 4, audioStart + MAXIMUM_SYNC_SEARCH_BYTES)

  for (let offset = audioStart; offset <= searchEnd; offset += 1) {
    const frame = parseFrame(bytes, offset)

    if (frame !== null && parseFrame(bytes, offset + frame.byteLength) !== null) {
      return offset
    }
  }

  throw new TypeError('invalid_mp3_frames')
}

export const extractMp3Preview = (bytes: Uint8Array, maximumDurationMs: number): Uint8Array => {
  if (!Number.isSafeInteger(maximumDurationMs) || maximumDurationMs <= 0) {
    throw new TypeError('invalid_preview_duration')
  }

  const audioStart = getAudioStart(bytes)
  const firstFrame = findFirstFrame(bytes, audioStart)
  let durationMs = 0
  let frameOffset = firstFrame
  let previewEnd = firstFrame
  let frameCount = 0

  while (durationMs < maximumDurationMs) {
    const frame = parseFrame(bytes, frameOffset)

    if (frame === null || frameOffset + frame.byteLength > bytes.byteLength) {
      break
    }

    if (durationMs + frame.durationMs > maximumDurationMs) {
      break
    }

    durationMs += frame.durationMs
    frameOffset += frame.byteLength
    previewEnd = frameOffset
    frameCount += 1
  }

  if (previewEnd === firstFrame) {
    throw new TypeError('invalid_mp3_frames')
  }

  const preview = bytes.slice(firstFrame, previewEnd)
  const firstPreviewFrame = parseFrame(preview, 0)!

  rewriteXingHeader(preview, firstPreviewFrame.byteLength, frameCount)
  rewriteVbriHeader(preview, firstPreviewFrame.byteLength, frameCount)
  return preview
}
