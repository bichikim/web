import {afterEach, expect, it, vi} from 'vitest'
import {
  getSupertonicAssetUrl,
  getSupertonicModelFileUrl,
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
} from '@winter-love/supertonic/model'
import {loadModelAsset} from '../load-model-asset'

afterEach(() => vi.unstubAllGlobals())

it('should resolve every selectable model and voice through the local development origin', async () => {
  const bytes = Uint8Array.of(1, 2, 3).buffer
  const fetchAsset = vi.fn().mockImplementation(async () => new Response(bytes))
  vi.stubGlobal('fetch', fetchAsset)
  const urls = [
    ...SUPERTONIC_MODELS.flatMap((model) =>
      model.files.map((file) => getSupertonicModelFileUrl(model, file)),
    ),
    ...SUPERTONIC_VOICES.map((voice) =>
      getSupertonicAssetUrl(`voice-styles/${voice.label.toLowerCase()}.json`),
    ),
    getSupertonicAssetUrl('onnx/tts.json'),
    getSupertonicAssetUrl('onnx/unicode_indexer.json'),
  ]
  await Promise.all(urls.map((url) => expect(loadModelAsset(url)).resolves.toEqual(bytes)))
  expect(fetchAsset).toHaveBeenCalledTimes(urls.length)
  for (const [url, init] of fetchAsset.mock.calls) {
    expect(new URL(url).origin).toBe(globalThis.location.origin)
    expect(new URL(url).pathname).toMatch(/^\/voice-assets\//u)
    expect(init).toEqual({cache: 'no-store'})
  }
})
it('should read downloaded weights from the desktop cache and presets from the bundle', async () => {
  const fetchAsset = vi.fn().mockImplementation(async () => new Response('asset'))
  vi.stubGlobal('fetch', fetchAsset)
  const model = SUPERTONIC_MODELS[0]
  const url = getSupertonicModelFileUrl(model, model.files[0])
  const cache = 'asset://localhost/%2Fcache%2Fvoice-assets/'
  await loadModelAsset(url, cache)
  await loadModelAsset(getSupertonicAssetUrl('onnx/tts.json'), cache)
  expect(fetchAsset).toHaveBeenNthCalledWith(1, `${cache}shared/duration_predictor.onnx`, {
    cache: 'no-store',
  })
  expect(fetchAsset).toHaveBeenNthCalledWith(
    2,
    new URL('/voice-assets/onnx/tts.json', globalThis.location.href).href,
    {cache: 'no-store'},
  )
})
it('should reject unknown assets without fetching remote URLs', async () => {
  const fetchAsset = vi.fn()
  vi.stubGlobal('fetch', fetchAsset)
  await expect(loadModelAsset('https://remote.invalid/model.onnx')).rejects.toThrow('포함')
  expect(fetchAsset).not.toHaveBeenCalled()
})
it('should report missing bundled files and allow retrying the same local asset', async () => {
  const fetchAsset = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, {status: 404}))
    .mockResolvedValueOnce(new Response('model'))
  vi.stubGlobal('fetch', fetchAsset)
  const url = getSupertonicAssetUrl('onnx/tts.json')
  await expect(loadModelAsset(url)).rejects.toThrow('404')
  await expect(loadModelAsset(url)).resolves.toBeInstanceOf(ArrayBuffer)
  expect(fetchAsset.mock.calls[0][0]).toBe(fetchAsset.mock.calls[1][0])
})
