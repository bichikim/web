/** @vitest-environment node */
import {createRequire} from 'node:module'
import {expect, test, vi} from 'vitest'
import {decodeSection} from '../decode-section'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))

const bytes = Uint8Array.of(1, 2, 3)

test.each([2, 4])('should reject a raw section with decoded length %d', async (decodedLength) => {
  await expect(
    decodeSection({codec: 0, decodedLength, source: new Blob([bytes])}),
  ).rejects.toBeInstanceOf(SyntaxError)
})

test.each([2, 4])(
  'should reject a Brotli section with decoded length %d',
  async (decodedLength) => {
    const brotli = await createRequire(import.meta.url)('brotli-wasm')
    await expect(
      decodeSection({codec: 1, decodedLength, source: new Blob([brotli.compress(bytes)])}),
    ).rejects.toBeInstanceOf(SyntaxError)
  },
)

test('should stop a cancelled section without consuming its stream', async () => {
  const source = new Blob([bytes])
  const stream = vi.spyOn(source, 'stream')
  const controller = new AbortController()
  controller.abort(new Error('cancelled'))
  await expect(
    decodeSection({codec: 0, decodedLength: bytes.length, signal: controller.signal, source}),
  ).rejects.toBe(controller.signal.reason)
  expect(stream).not.toHaveBeenCalled()
})
