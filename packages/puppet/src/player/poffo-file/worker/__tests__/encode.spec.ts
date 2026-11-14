/** @vitest-environment node */
import {createRequire} from 'node:module'
import {decodeFile} from '../../decode-file'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../create-demo-document'
import {compactDocumentTextures} from '../../../texture-assets'
import {serializeDocument} from '../../../serialize-document'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))
afterEach(() => vi.unstubAllGlobals())

test('should compress a Worker request with deduplicated texture references', async () => {
  const target = new EventTarget()
  const postMessage = vi.fn()
  const response = new Promise<{ok: boolean; blob: Blob}>((resolve) => {
    postMessage.mockImplementation(resolve)
  })
  vi.stubGlobal('self', Object.assign(target, {postMessage}))
  await import('../encode')
  const demo = createDemoDocument()
  const document = {
    ...demo,
    parts: demo.parts.map((part) => ({...part, texture: demo.parts[0]!.texture})),
  }
  const original = structuredClone(document)
  target.dispatchEvent(
    new MessageEvent('message', {
      data: compactDocumentTextures(document),
    }),
  )
  const result = await response
  expect(result.ok).toBe(true)
  expect(await decodeFile(result.blob)).toEqual(JSON.parse(serializeDocument(document)))
  expect(document).toEqual(original)
})
