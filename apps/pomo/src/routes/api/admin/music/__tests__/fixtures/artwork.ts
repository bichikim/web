import {readFile} from 'node:fs/promises'
import {type Mock, vi} from 'vitest'

const TRACK_ID = '11111111-1111-4111-8111-111111111111'
export const RED_ASSET = '22222222-2222-4222-8222-222222222222'
export const BLUE_ASSET = '33333333-3333-4333-8333-333333333333'
export const sourcePath = (assetId: string): string => `tracks/${TRACK_ID}/${assetId}/source.mp3`
export const artworkPath = (assetId: string): string => `/public/track-artwork/${assetId}/cover`

interface StoredObject {
  readonly body: Uint8Array
  readonly contentType: string | null
}

interface ArtworkStorage {
  readonly fetcher: Mock<typeof fetch>
  readonly objects: Map<string, StoredObject>
}

// ID3v2 permits zero padding between its frames and the MPEG audio.
const padMetadata = (source: Buffer, paddingBytes: number): Buffer => {
  const headerBytes = 10
  const sizeOffset = 6
  const integerBase = 128
  const size = [...source.subarray(sizeOffset, headerBytes)].reduce(
    (value, byte) => value * integerBase + byte,
    0,
  )
  const header = Buffer.from(source.subarray(0, headerBytes))
  let paddedSize = size + paddingBytes
  for (let index = headerBytes - 1; index >= sizeOffset; index -= 1) {
    header[index] = paddedSize % integerBase
    paddedSize = Math.floor(paddedSize / integerBase)
  }
  return Buffer.concat([
    header,
    source.subarray(headerBytes, headerBytes + size),
    Buffer.alloc(paddingBytes),
    source.subarray(headerBytes + size),
  ])
}

export const createStorage = async (paddingBytes = 0): Promise<ArtworkStorage> => {
  const red = await readFile(new URL('./artwork/red.mp3', import.meta.url))
  const blue = await readFile(new URL('./artwork/blue.mp3', import.meta.url))
  const sources = new Map([
    [`/private/${sourcePath(RED_ASSET)}`, padMetadata(red, paddingBytes)],
    [`/private/${sourcePath(BLUE_ASSET)}`, blue],
  ])
  const objects = new Map<string, StoredObject>()
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    if (!(input instanceof Request)) {
      throw new Error('Expected a signed storage request')
    }
    const path = new URL(input.url).pathname
    if (input.method === 'GET') {
      const source = sources.get(path)
      if (source === undefined) {
        throw new Error(`Unexpected storage read: ${path}`)
      }
      const range = /^bytes=(?<start>\d+)-(?<end>\d+)$/u.exec(input.headers.get('Range') ?? '')
      const body = range === null ? source : source.subarray(Number(range[1]), Number(range[2]) + 1)
      return new Response(new Uint8Array(body), {
        headers: {'Content-Length': String(body.byteLength), ETag: path},
      })
    }
    if (input.method === 'PUT') {
      objects.set(path, {
        body: new Uint8Array(await input.arrayBuffer()),
        contentType: input.headers.get('Content-Type'),
      })
      return new Response(null, {status: 200})
    }
    throw new Error(`Unexpected storage operation: ${input.method}`)
  })
  vi.stubGlobal('fetch', fetcher)
  return {fetcher, objects}
}
