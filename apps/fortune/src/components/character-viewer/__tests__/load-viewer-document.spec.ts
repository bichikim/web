/** @vitest-environment jsdom */

import {afterEach, expect, test, vi} from 'vitest'
import {
  createDemoDocument,
  parseDocumentValue,
  preparePuppetDocument,
} from '@winter-love/puppet/player'
import {loadViewerDocument} from '../load-viewer-document'

vi.mock('@winter-love/puppet/player', async () => {
  const actual = await vi.importActual<typeof import('@winter-love/puppet/player')>(
    '@winter-love/puppet/player',
  )
  return {...actual, preparePuppetDocument: vi.fn()}
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

test('should send a shared atlas once when preparing viewer tracking', async () => {
  const demo = createDemoDocument()
  const texture = demo.parts[0]!.texture
  const document = {
    ...demo,
    parts: demo.parts.map((part) => ({...part, texture})),
  }
  const source = parseDocumentValue(document)
  if (!source.ok) {
    throw new Error('Invalid viewer fixture')
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('model')))
  const prepare = vi.mocked(preparePuppetDocument)
  prepare
    .mockResolvedValueOnce(source)
    .mockImplementationOnce(async (options) =>
      'document' in options
        ? parseDocumentValue(options.document)
        : {error: {code: 'invalid-document'}, ok: false},
    )

  const result = await loadViewerDocument(new AbortController().signal)

  expect(prepare.mock.calls[1]?.[0]).toMatchObject({
    document: {
      parts: document.parts.map((part) => ({id: part.id, texture: {assetId: 'texture-0'}})),
      textureAssets: {'texture-0': texture.src},
    },
  })
  expect(result.parts.map((part) => part.texture.src)).toEqual(
    document.parts.map((part) => part.texture.src),
  )
})
