// oxlint-disable no-magic-numbers, eslint/no-bitwise -- Ogg uses fixed binary fields and a bitwise CRC algorithm.
import type {SampleRate} from 'libopus-wasm'

const OPUS_MEDIA_TYPE = 'audio/ogg; codecs=opus'
const OPUS_OUTPUT_SAMPLE_RATE = 48_000
const OPUS_BITRATE = 32_000
const OGG_MAXIMUM_SEGMENTS = 255
const OGG_SEGMENT_SIZE = 255
const OGG_CAPTURE_PATTERN = 'OggS'
const OPUS_SAMPLE_RATES = [8000, 12_000, 16_000, 24_000, 48_000] as const
const textEncoder = new TextEncoder()

interface OggPacket {
  readonly data: Uint8Array
  readonly granulePosition: number
}

interface OggPageOptions {
  readonly endOfStream?: boolean
  readonly firstPage?: boolean
  readonly granulePosition: number
  readonly packets: ReadonlyArray<Uint8Array>
  readonly sequence: number
  readonly streamSerial: number
}

const createCrcTable = () => {
  const table = new Uint32Array(256)

  for (let index = 0; index < table.length; index += 1) {
    let remainder = index << 24

    for (let bit = 0; bit < 8; bit += 1) {
      remainder = (remainder & 0x8000_0000) === 0 ? remainder << 1 : (remainder << 1) ^ 0x04c1_1db7
    }

    table[index] = remainder >>> 0
  }

  return table
}

const CRC_TABLE = createCrcTable()

const getOggCrc = (data: Uint8Array) => {
  let checksum = 0

  for (const byte of data) {
    checksum = ((checksum << 8) ^ (CRC_TABLE[((checksum >>> 24) ^ byte) & 0xff] ?? 0)) >>> 0
  }

  return checksum
}

const writeText = (target: Uint8Array, offset: number, text: string) => {
  target.set(textEncoder.encode(text), offset)
}

const getLacingValues = (packetLength: number) => {
  const values = new Uint8Array(Math.floor(packetLength / OGG_SEGMENT_SIZE) + 1)
  values.fill(OGG_SEGMENT_SIZE, 0, values.length - 1)
  values[values.length - 1] = packetLength % OGG_SEGMENT_SIZE
  return values
}

const createOggPage = (options: OggPageOptions) => {
  const lacingValues = options.packets.map((packet) => getLacingValues(packet.length))
  const segmentCount = lacingValues.reduce((total, values) => total + values.length, 0)

  if (segmentCount > OGG_MAXIMUM_SEGMENTS) {
    throw new RangeError('An Ogg page cannot contain more than 255 segments.')
  }

  const payloadLength = options.packets.reduce((total, packet) => total + packet.length, 0)
  const page = new Uint8Array(27 + segmentCount + payloadLength)
  const view = new DataView(page.buffer)
  let headerType = options.firstPage === true ? 0x02 : 0

  if (options.endOfStream === true) {
    headerType |= 0x04
  }

  writeText(page, 0, OGG_CAPTURE_PATTERN)
  page[4] = 0
  page[5] = headerType
  view.setUint32(6, options.granulePosition >>> 0, true)
  view.setUint32(10, Math.floor(options.granulePosition / 0x1_0000_0000), true)
  view.setUint32(14, options.streamSerial, true)
  view.setUint32(18, options.sequence, true)
  view.setUint32(22, 0, true)
  page[26] = segmentCount

  let segmentOffset = 27
  let payloadOffset = 27 + segmentCount

  for (let packetIndex = 0; packetIndex < options.packets.length; packetIndex += 1) {
    const packet = options.packets[packetIndex]
    const packetLacing = lacingValues[packetIndex]

    if (packet === undefined || packetLacing === undefined) {
      throw new Error('Expected matching Ogg packet and lacing data.')
    }

    page.set(packetLacing, segmentOffset)
    page.set(packet, payloadOffset)
    segmentOffset += packetLacing.length
    payloadOffset += packet.length
  }

  view.setUint32(22, getOggCrc(page), true)
  return page
}

const createOpusHead = (sampleRate: number, preSkip: number) => {
  const packet = new Uint8Array(19)
  const view = new DataView(packet.buffer)

  writeText(packet, 0, 'OpusHead')
  packet[8] = 1
  packet[9] = 1
  view.setUint16(10, preSkip, true)
  view.setUint32(12, sampleRate, true)
  view.setInt16(16, 0, true)
  packet[18] = 0
  return packet
}

const createOpusTags = () => {
  const vendor = textEncoder.encode('Pomo/libopus-wasm')
  const packet = new Uint8Array(16 + vendor.length)
  const view = new DataView(packet.buffer)

  writeText(packet, 0, 'OpusTags')
  view.setUint32(8, vendor.length, true)
  packet.set(vendor, 12)
  view.setUint32(12 + vendor.length, 0, true)
  return packet
}

const createAudioPages = (packets: ReadonlyArray<OggPacket>, streamSerial: number) => {
  const packetGroups: Array<Array<OggPacket>> = []
  let currentGroup: Array<OggPacket> = []
  let currentSegmentCount = 0

  for (const packet of packets) {
    const packetSegmentCount = getLacingValues(packet.data.length).length

    if (packetSegmentCount > OGG_MAXIMUM_SEGMENTS) {
      throw new RangeError('An Opus packet is too large for one Ogg page.')
    }

    if (currentSegmentCount + packetSegmentCount > OGG_MAXIMUM_SEGMENTS) {
      packetGroups.push(currentGroup)
      currentGroup = []
      currentSegmentCount = 0
    }

    currentGroup.push(packet)
    currentSegmentCount += packetSegmentCount
  }

  if (currentGroup.length > 0) {
    packetGroups.push(currentGroup)
  }

  return packetGroups.map((group, index) => {
    const lastPacket = group.at(-1)

    if (lastPacket === undefined) {
      throw new Error('Expected an Opus packet in every Ogg audio page.')
    }

    return createOggPage({
      endOfStream: index === packetGroups.length - 1,
      granulePosition: lastPacket.granulePosition,
      packets: group.map((packet) => packet.data),
      sequence: index + 2,
      streamSerial,
    })
  })
}

const concatenate = (parts: ReadonlyArray<Uint8Array>) => {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0

  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}

const isOpusSampleRate = (sampleRate: number): sampleRate is SampleRate =>
  OPUS_SAMPLE_RATES.some((supportedRate) => supportedRate === sampleRate)

/** Encodes mono PCM speech into a browser-playable Ogg Opus file. */
export const encodeOpusBlob = async (samples: Float32Array, sampleRate: number): Promise<Blob> => {
  if (samples.length === 0) {
    throw new RangeError('Cannot encode empty audio.')
  }

  if (!isOpusSampleRate(sampleRate)) {
    throw new RangeError(`Unsupported Opus sample rate: ${sampleRate}`)
  }

  const {Application, createEncoder, Signal} = await import('libopus-wasm')
  const encoder = await createEncoder({
    application: Application.Voip,
    bitrate: OPUS_BITRATE,
    channels: 1,
    complexity: 10,
    sampleRate,
    signal: Signal.Voice,
    vbr: true,
  })

  try {
    const granuleScale = OPUS_OUTPUT_SAMPLE_RATE / sampleRate
    const preSkip = Math.round(encoder.getLookahead() * granuleScale)
    const packetCount = Math.ceil((samples.length + encoder.getLookahead()) / encoder.frameSize)
    const packetDuration = encoder.frameSize * granuleScale
    const finalGranulePosition = preSkip + Math.round(samples.length * granuleScale)
    const packets: Array<OggPacket> = []

    for (let packetIndex = 0; packetIndex < packetCount; packetIndex += 1) {
      const frameStart = packetIndex * encoder.frameSize
      const frame = new Float32Array(encoder.frameSize)

      if (frameStart < samples.length) {
        frame.set(samples.subarray(frameStart, frameStart + encoder.frameSize))
      }

      packets.push({
        data: encoder.encodeFloat(frame),
        granulePosition:
          packetIndex === packetCount - 1
            ? finalGranulePosition
            : (packetIndex + 1) * packetDuration,
      })
    }

    const streamSerial = Math.floor(Math.random() * 0x1_0000_0000)
    const pages = [
      createOggPage({
        firstPage: true,
        granulePosition: 0,
        packets: [createOpusHead(sampleRate, preSkip)],
        sequence: 0,
        streamSerial,
      }),
      createOggPage({
        granulePosition: 0,
        packets: [createOpusTags()],
        sequence: 1,
        streamSerial,
      }),
      ...createAudioPages(packets, streamSerial),
    ]
    const file = concatenate(pages)

    return new Blob([file], {type: OPUS_MEDIA_TYPE})
  } finally {
    encoder.free()
  }
}
