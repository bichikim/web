/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../create-demo-document'
import {serializeDocument} from '../../serialize-document'
import {parseDocumentValue} from '../../parse-document'
import {expandDocumentTextureAssets} from '../../texture-assets'

afterEach(() => vi.unstubAllGlobals())

test('should send repeated textures only once from the validation Worker', async () => {
  const target = new EventTarget()
  const postMessage = vi.fn()
  vi.stubGlobal('self', Object.assign(target, {postMessage}))
  await import('../prepare-puppet-document-worker')
  const demo = createDemoDocument()
  const document = {
    ...demo,
    parts: demo.parts.map((part) => ({...part, texture: demo.parts[0]!.texture})),
  }
  target.dispatchEvent(
    new MessageEvent('message', {data: {source: serializeDocument(document), type: 'source'}}),
  )
  const result = postMessage.mock.calls[0]?.[0]
  expect(result.ok).toBe(true)
  expect(result.document.textureAssets).toBeDefined()
  expect(
    result.document.parts.every(
      (part: {texture: {assetId?: string}}) => part.texture.assetId !== undefined,
    ),
  ).toBe(true)
  expect(parseDocumentValue(expandDocumentTextureAssets(result.document))).toMatchObject({ok: true})
})
