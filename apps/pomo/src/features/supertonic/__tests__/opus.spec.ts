import {beforeEach, expect, it, vi} from 'vitest'

import {encodeOpusBlob} from '../opus'

const encoderMocks = vi.hoisted(() => ({
  create: vi.fn(),
  encodeFloat: vi.fn(),
  free: vi.fn(),
  getLookahead: vi.fn(() => 156),
}))

vi.mock('libopus-wasm', () => ({
  Application: {Voip: 2048},
  createEncoder: encoderMocks.create,
  Signal: {Voice: 3001},
}))

interface OggPage {
  readonly granulePosition: number
  readonly headerType: number
  readonly payload: Uint8Array
  readonly sequence: number
}

const readBlob = (blob: Blob) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => reject(new Error('Failed to read the Opus blob.')))
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('Expected Opus blob data as an ArrayBuffer.'))
      }
    })
    reader.readAsArrayBuffer(blob)
  })

const readPages = (data: Uint8Array): ReadonlyArray<OggPage> => {
  const pages: Array<OggPage> = []
  let offset = 0

  while (offset < data.length) {
    const segmentCount = data[offset + 26] ?? 0
    const segmentTable = data.subarray(offset + 27, offset + 27 + segmentCount)
    const payloadLength = segmentTable.reduce((total, length) => total + length, 0)
    const payloadStart = offset + 27 + segmentCount
    const view = new DataView(data.buffer, data.byteOffset + offset)

    pages.push({
      granulePosition: view.getUint32(6, true) + view.getUint32(10, true) * 0x1_0000_0000,
      headerType: data[offset + 5] ?? 0,
      payload: data.slice(payloadStart, payloadStart + payloadLength),
      sequence: view.getUint32(18, true),
    })
    offset = payloadStart + payloadLength
  }

  return pages
}

beforeEach(() => {
  vi.clearAllMocks()
  encoderMocks.encodeFloat.mockReturnValue(new Uint8Array(80).fill(7))
  encoderMocks.create.mockResolvedValue({
    encodeFloat: encoderMocks.encodeFloat,
    frameSize: 480,
    free: encoderMocks.free,
    getLookahead: encoderMocks.getLookahead,
  })
})

it('should encode mono speech into a complete Ogg Opus stream', async () => {
  const samples = new Float32Array(960).fill(0.25)
  const blob = await encodeOpusBlob(samples, 24_000)
  const pages = readPages(new Uint8Array(await readBlob(blob)))

  expect(blob.type).toBe('audio/ogg; codecs=opus')
  expect(encoderMocks.create).toHaveBeenCalledWith({
    application: 2048,
    bitrate: 32_000,
    channels: 1,
    complexity: 10,
    sampleRate: 24_000,
    signal: 3001,
    vbr: true,
  })
  expect(encoderMocks.encodeFloat).toHaveBeenCalledTimes(3)
  expect(encoderMocks.free).toHaveBeenCalledOnce()
  expect(pages).toHaveLength(3)
  expect(new TextDecoder().decode(pages[0]?.payload.subarray(0, 8))).toBe('OpusHead')
  expect(pages[0]).toMatchObject({granulePosition: 0, headerType: 0x02, sequence: 0})
  expect(new TextDecoder().decode(pages[1]?.payload.subarray(0, 8))).toBe('OpusTags')
  expect(pages[2]).toMatchObject({granulePosition: 2232, headerType: 0x04, sequence: 2})
})

it('should split long audio across valid Ogg pages', async () => {
  const samples = new Float32Array(480 * 256)
  const blob = await encodeOpusBlob(samples, 24_000)
  const pages = readPages(new Uint8Array(await readBlob(blob)))

  expect(pages).toHaveLength(4)
  expect(pages[2]).toMatchObject({headerType: 0, sequence: 2})
  expect(pages[3]).toMatchObject({headerType: 0x04, sequence: 3})
})

it('should reject empty audio and unsupported sample rates', async () => {
  await expect(encodeOpusBlob(new Float32Array(), 24_000)).rejects.toThrow(
    'Cannot encode empty audio.',
  )
  await expect(encodeOpusBlob(Float32Array.of(0), 44_100)).rejects.toThrow(
    'Unsupported Opus sample rate: 44100',
  )
  expect(encoderMocks.create).not.toHaveBeenCalled()
})
