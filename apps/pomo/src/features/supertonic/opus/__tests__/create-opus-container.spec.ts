/** @vitest-environment node */
// oxlint-disable no-magic-numbers, eslint/no-bitwise -- Ogg 명세의 필드 위치와 CRC 다항식을 검증한다.
import {expect, it} from 'vitest'
import {createOpusContainer} from '../create-opus-container'

interface Page {
  readonly bytes: Uint8Array
  readonly header: DataView
  readonly lacing: ReadonlyArray<number>
  readonly payload: Uint8Array
}

const readPages = async (blob: Blob): Promise<ReadonlyArray<Page>> => {
  const data = new Uint8Array(await blob.arrayBuffer())
  const pages: Array<Page> = []
  let offset = 0
  while (offset < data.length) {
    const segmentCount = data[offset + 26]!
    const lacing = Array.from(data.subarray(offset + 27, offset + 27 + segmentCount))
    const payloadStart = offset + 27 + segmentCount
    const end = payloadStart + lacing.reduce((total, length) => total + length, 0)
    const bytes = data.slice(offset, end)
    pages.push({
      bytes,
      header: new DataView(bytes.buffer),
      lacing,
      payload: data.slice(payloadStart, end),
    })
    offset = end
  }
  return pages
}

const hasValidChecksum = (page: Page): boolean => {
  const data = page.bytes.slice()
  data.fill(0, 22, 26)
  let checksum = 0
  for (const byte of data) {
    checksum ^= byte << 24
    for (let bit = 0; bit < 8; bit += 1) {
      checksum = checksum & 0x8000_0000 ? (checksum << 1) ^ 0x04c1_1db7 : checksum << 1
    }
  }
  return checksum >>> 0 === page.header.getUint32(22, true)
}

it('should write Opus metadata and stream headers with valid page checksums', async () => {
  const blob = createOpusContainer({
    packets: [{data: Uint8Array.of(1, 2), granulePosition: 1234}],
    preSkip: 312,
    sampleRate: 24_000,
    streamSerial: 0xfedc_ba98,
  })
  const pages = await readPages(blob)
  const metadata = new DataView(pages[0]!.payload.buffer)
  expect(blob.type).toBe('audio/ogg; codecs=opus')
  expect(pages).toHaveLength(3)
  expect(new TextDecoder().decode(pages[0]!.payload.subarray(0, 8))).toBe('OpusHead')
  expect(pages[0]!.payload[9]).toBe(1)
  expect(metadata.getUint16(10, true)).toBe(312)
  expect(metadata.getUint32(12, true)).toBe(24_000)
  expect(new TextDecoder().decode(pages[1]!.payload.subarray(0, 8))).toBe('OpusTags')
  expect(pages.map((page) => page.header.getUint8(5))).toEqual([2, 0, 4])
  expect(pages.map((page) => page.header.getUint32(18, true))).toEqual([0, 1, 2])
  expect(pages.every((page) => page.header.getUint32(14, true) === 0xfedc_ba98)).toBe(true)
  expect(pages.every(hasValidChecksum)).toBe(true)
})

it('should copy packet views in order and retain zero laces at exact boundaries', async () => {
  const backing = Uint8Array.of(99, 1, 2, 99)
  const blob = createOpusContainer({
    packets: [
      {data: backing.subarray(1, 3), granulePosition: 960},
      {data: new Uint8Array(255).fill(3), granulePosition: 1920},
      {data: new Uint8Array(510).fill(4), granulePosition: 2880},
      {data: new Uint8Array(), granulePosition: 3000},
    ],
    preSkip: 0,
    sampleRate: 48_000,
    streamSerial: 1,
  })
  backing.fill(0)
  const pages = await readPages(blob)
  expect(pages).toHaveLength(3)
  expect(pages[2]!.lacing).toEqual([2, 255, 0, 255, 255, 0, 0])
  expect(pages[2]!.payload).toEqual(
    Uint8Array.from([1, 2, ...new Array(255).fill(3), ...new Array(510).fill(4)]),
  )
  expect(pages[2]!.header.getUint32(6, true)).toBe(3000)
  expect(pages.every(hasValidChecksum)).toBe(true)
})

it('should split at 255 segments and preserve both halves of a granule position', async () => {
  const position = 0x1_0000_0123
  const pages = await readPages(
    createOpusContainer({
      packets: [
        {data: new Uint8Array(65_024), granulePosition: position},
        {data: Uint8Array.of(9), granulePosition: position + 1},
      ],
      preSkip: 312,
      sampleRate: 24_000,
      streamSerial: 1,
    }),
  )
  expect(pages).toHaveLength(4)
  expect(pages[2]!.lacing).toHaveLength(255)
  expect(pages[2]!.header.getUint8(5)).toBe(0)
  expect(pages[2]!.header.getUint32(6, true)).toBe(0x123)
  expect(pages[2]!.header.getUint32(10, true)).toBe(1)
  expect(pages[3]!.payload).toEqual(Uint8Array.of(9))
  expect(pages[3]!.header.getUint8(5)).toBe(4)
  expect(pages[3]!.header.getUint32(18, true)).toBe(3)
  expect(pages[3]!.header.getUint32(6, true)).toBe(0x124)
  expect(pages[3]!.header.getUint32(10, true)).toBe(1)
  expect(pages.every(hasValidChecksum)).toBe(true)
})

it('should reject a packet that exceeds one page with the existing diagnostic', () => {
  expect(() =>
    createOpusContainer({
      packets: [{data: new Uint8Array(65_025), granulePosition: 960}],
      preSkip: 312,
      sampleRate: 24_000,
      streamSerial: 1,
    }),
  ).toThrow(new RangeError('An Opus packet is too large for one Ogg page.'))
})
