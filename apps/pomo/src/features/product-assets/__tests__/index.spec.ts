/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

import {createPomoAssetFetcher, isPomoAssetBundled, resolvePomoAssetUrl} from '../index'

const MODEL_URL =
  'https://storage.pomofi.io/models/text-generation/model/revision/onnx/model_q4.onnx'
const AUDIO_URL = 'https://storage.pomofi.io/tracks/focus.mp3?v=20260918'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('should retain R2 product assets outside the Steam distribution', () => {
  expect(resolvePomoAssetUrl(MODEL_URL)).toBe(MODEL_URL)
  expect(isPomoAssetBundled(MODEL_URL)).toBe(false)
})

it('should resolve R2 model and audio assets into the Steam bundle', () => {
  vi.stubEnv('VITE_POMO_DISTRIBUTION_TARGET', 'steam')

  expect(resolvePomoAssetUrl(MODEL_URL)).toBe(
    '/assets-steam/models/text-generation/model/revision/onnx/model_q4.onnx',
  )
  expect(resolvePomoAssetUrl(AUDIO_URL)).toBe('/assets-steam/audio/tracks/focus.mp3?v=20260918')
  expect(isPomoAssetBundled(MODEL_URL)).toBe(true)
})

it('should leave non-product providers unchanged on Steam', () => {
  vi.stubEnv('VITE_POMO_DISTRIBUTION_TARGET', 'steam')
  const url = 'https://huggingface.co/model/resolve/main/config.json'

  expect(resolvePomoAssetUrl(url)).toBe(url)
  expect(isPomoAssetBundled(url)).toBe(false)
})

it('should route model fetches through the resolved Steam asset URL', async () => {
  vi.stubEnv('VITE_POMO_DISTRIBUTION_TARGET', 'steam')
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 200}))
  const assetFetcher = createPomoAssetFetcher(fetcher)

  await assetFetcher(AUDIO_URL)

  expect(fetcher).toHaveBeenCalledWith('/assets-steam/audio/tracks/focus.mp3?v=20260918', undefined)
})
