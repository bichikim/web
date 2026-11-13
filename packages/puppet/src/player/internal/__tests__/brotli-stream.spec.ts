/** @vitest-environment node */
import {createRequire} from 'node:module'
import {brotliCompressSync} from 'node:zlib'
import {afterEach, expect, test, vi} from 'vitest'
import {createBrotliStream} from '../brotli-stream'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))
afterEach(() => vi.restoreAllMocks())

const collect = async (source: ReadableStream<Uint8Array>) =>
  new Uint8Array(await new Response(source).arrayBuffer())

test('should drain multiple output buffers and preserve UTF-8 bytes', async () => {
  const bytes = new TextEncoder().encode('고양이🐈'.repeat(16000))
  const stream = await createBrotliStream(
    new Blob([brotliCompressSync(bytes)]).stream(),
    'decompress',
  )
  expect(Buffer.from(await collect(stream)).equals(bytes)).toBe(true)
})

test.each(['truncated', 'trailing', 'invalid'])(
  'should reject %s compressed bytes',
  async (kind) => {
    const bytes = brotliCompressSync('valid data')
    const inputs = {
      invalid: Buffer.from([255, 255]),
      trailing: Buffer.concat([bytes, Buffer.from([0])]),
      truncated: bytes.subarray(0, -1),
    }
    const stream = await createBrotliStream(
      new Blob([inputs[kind as keyof typeof inputs]]).stream(),
      'decompress',
    )
    await expect(collect(stream)).rejects.toBeInstanceOf(SyntaxError)
  },
)

test('should cancel a pending input read and free its decoder once', async () => {
  const {default: loading} = await import('brotli-wasm')
  const brotli = await loading
  const free = vi.spyOn(brotli.DecompressStream.prototype, 'free')
  const cancel = vi.fn()
  const stream = await createBrotliStream(new ReadableStream({cancel}), 'decompress')
  const reader = stream.getReader()
  const pending = reader.read()
  await reader.cancel('stop')
  expect(await pending).toEqual({done: true, value: undefined})
  expect(cancel).toHaveBeenCalledWith('stop')
  expect(free).toHaveBeenCalledOnce()
})
