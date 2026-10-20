// oxlint-disable no-magic-numbers, eslint/no-bitwise -- Ogg 필드와 CRC 연산은 파일 형식에 고정된 값이다.
import {sumBy} from 'es-toolkit/math'

const OPUS_MEDIA_TYPE = 'audio/ogg; codecs=opus'
const OGG_MAXIMUM_SEGMENTS = 255
const OGG_SEGMENT_SIZE = 255
const OGG_CAPTURE_PATTERN = 'OggS'
const textEncoder = new TextEncoder()

export interface OpusPacket {
  /** 호출자가 소유한 압축 패킷이며 조립 중 변경하지 않는다. */
  readonly data: Uint8Array
  /** 패킷이 끝나는 48 kHz 출력 기준 위치다. */
  readonly granulePosition: number
}

interface OggPageOptions {
  /** 마지막 페이지 여부이며 생략하면 일반 페이지다. */
  readonly endOfStream?: boolean
  /** 첫 페이지 여부이며 생략하면 일반 페이지다. */
  readonly firstPage?: boolean
  /** 이 페이지의 마지막 패킷이 끝나는 출력 위치다. */
  readonly granulePosition: number
  /** 순서대로 복사할 패킷 바이트다. */
  readonly packets: ReadonlyArray<Uint8Array>
  /** 스트림 안의 페이지 순번이다. */
  readonly sequence: number
  /** 호출자가 생성한 논리 스트림 식별자다. */
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
    const tableIndex = ((checksum >>> 24) ^ byte) & 0xff
    const tableValue = CRC_TABLE[tableIndex] as number
    checksum = ((checksum << 8) ^ tableValue) >>> 0
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
  const packetParts = options.packets.map((packet) => ({
    lacingValues: getLacingValues(packet.length),
    packet,
  }))
  const segmentCount = sumBy(packetParts, (packetPart) => packetPart.lacingValues.length)
  const payloadLength = sumBy(packetParts, (packetPart) => packetPart.packet.length)
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

  for (const {lacingValues, packet} of packetParts) {
    page.set(lacingValues, segmentOffset)
    page.set(packet, payloadOffset)
    segmentOffset += lacingValues.length
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

const createAudioPages = (packets: ReadonlyArray<OpusPacket>, streamSerial: number) => {
  const packetGroups: Array<Array<OpusPacket>> = []
  let currentGroup: Array<OpusPacket> = []
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

  packetGroups.push(currentGroup)

  return packetGroups.map((group, index) => {
    const lastPacket = group.at(-1) as OpusPacket

    return createOggPage({
      endOfStream: index === packetGroups.length - 1,
      granulePosition: lastPacket.granulePosition,
      packets: group.map((packet) => packet.data),
      sequence: index + 2,
      streamSerial,
    })
  })
}

export interface CreateOpusContainerOptions {
  /** 압축된 패킷과 출력 위치이며 하나 이상을 순서대로 전달한다. */
  readonly packets: ReadonlyArray<OpusPacket>
  /** 헤더에 기록할 원본 PCM 샘플링 주파수다. */
  readonly sampleRate: number
  /** 디코딩 앞부분에서 건너뛸 48 kHz 기준 샘플 수다. */
  readonly preSkip: number
  /** 호출자가 생성한 논리 스트림 식별자다. */
  readonly streamSerial: number
}

/** 압축된 Opus 패킷을 복사해 헤더와 CRC를 갖춘 Ogg Blob을 동기적으로 조립한다. */
export const createOpusContainer = (options: CreateOpusContainerOptions): Blob => {
  const pages = [
    createOggPage({
      firstPage: true,
      granulePosition: 0,
      packets: [createOpusHead(options.sampleRate, options.preSkip)],
      sequence: 0,
      streamSerial: options.streamSerial,
    }),
    createOggPage({
      granulePosition: 0,
      packets: [createOpusTags()],
      sequence: 1,
      streamSerial: options.streamSerial,
    }),
    ...createAudioPages(options.packets, options.streamSerial),
  ]
  return new Blob(pages, {type: OPUS_MEDIA_TYPE})
}
