/** @vitest-environment node */
import {createRequire} from 'node:module'
import {readFile} from 'node:fs/promises'
import {expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {encodeFile} from '../encode-file'
import {decodeFile} from '../decode-file'
import {decodeHeader, POFFO_HEADER_BYTES} from '../header'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))

const fixture = async () => {
  const source = {...createEmptyDocument(), image: 'data:image/png;base64,AAECAw=='}
  return new Uint8Array(await (await encodeFile(source)).arrayBuffer())
}

test.each(['header', 'index', 'metadata', 'asset'])(
  'should reject corrupted %s bytes',
  async (section) => {
    const bytes = await fixture()
    const header = decodeHeader(bytes.subarray(0, POFFO_HEADER_BYTES))
    const positions = {
      asset: bytes.length - 1,
      header: 8,
      index: POFFO_HEADER_BYTES,
      metadata: POFFO_HEADER_BYTES + header.indexLength,
    }
    const offset = positions[section as keyof typeof positions]
    bytes[offset] = (bytes[offset]! + 1) % 256
    await expect(decodeFile(new Blob([bytes]))).rejects.toBeInstanceOf(SyntaxError)
  },
)

test.each(['truncated', 'trailing'])(
  'should reject %s file data instead of restoring a partial document',
  async (kind) => {
    const bytes = await fixture()
    const file =
      kind === 'truncated' ? new Blob([bytes.subarray(0, -1)]) : new Blob([bytes, Uint8Array.of(0)])
    await expect(decodeFile(file)).rejects.toBeInstanceOf(SyntaxError)
  },
)

test('should decode by its bytes without a filename or MIME type', async () => {
  expect(await decodeFile(new Blob([await fixture()]))).toMatchObject(createEmptyDocument())
})

test('should preserve cancellation instead of reporting a damaged file', async () => {
  const controller = new AbortController()
  const pending = decodeFile(new Blob([await fixture()]), controller.signal)
  controller.abort(new Error('stop'))
  await expect(pending).rejects.toBe(controller.signal.reason)
})

test.each(['raw', 'compressed'])(
  'should read the fixed %s SDK interoperability fixture',
  async (name) => {
    const directory = new URL('./fixtures/', import.meta.url)
    const expected = JSON.parse(await readFile(new URL('document.json', directory), 'utf8'))
    expected.authoring.float32[1] = -0
    const bytes = await readFile(new URL(`${name}.poffo`, directory))
    expect(await decodeFile(new Blob([bytes]))).toEqual(expected)
  },
)
