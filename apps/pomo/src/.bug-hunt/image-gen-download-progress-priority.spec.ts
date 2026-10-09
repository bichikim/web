/** @vitest-environment jsdom */
import {type ModelDownloadItem, useModelDownload} from 'src/features/model-download'
import {createModelDownloadController} from 'src/features/model-download/controller'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))

import {createSignal} from 'solid-js'
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {runImageGeneration} from 'src/features/image-generation/client'
import {useImageGeneration} from 'src/features/image-generation/use-image-generation'

vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))

beforeEach(() => {
  vi.mocked(useModelDownload).mockReturnValue(createModelDownloadController())
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should surface image-model download progress when text and image load together', async () => {
  const controller = createModelDownloadController()
  const [items, setItems] = createSignal<readonly ModelDownloadItem[]>([])
  vi.spyOn(controller, 'downloads').mockImplementation(items)
  vi.mocked(useModelDownload).mockReturnValue(controller)
  vi.mocked(runImageGeneration).mockReturnValue(new Promise(() => {}))
  const {result} = renderHook(useImageGeneration)
  await vi.waitFor(() => expect(result.supported()).toBe(true))
  result.setIdea('park walk')
  setItems([
    {
      label: 'Text model',
      percentage: 77,
      status: 'loading',
      target: {kind: 'text', modelId: 'gemma-4-e2b'},
    },
    {
      label: 'Image model',
      percentage: 12,
      status: 'loading',
      target: {kind: 'image', modelId: 'ternary'},
    },
  ])
  result.generate()
  expect(result.percentage()).toBe(12)
  expect(result.status()).toContain('Image model')
})
