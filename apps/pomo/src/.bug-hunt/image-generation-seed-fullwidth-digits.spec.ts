/** @vitest-environment jsdom */
import {useModelDownload} from 'src/features/model-download'
import {createModelDownloadController} from 'src/features/model-download/controller'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))

import {cleanup, renderHook} from '@solidjs/testing-library'
import * as m from '@paraglide/message'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {runImageGeneration} from 'src/features/image-generation/client'
import {useImageGeneration} from 'src/features/image-generation/use-image-generation'

vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))

const originalGetLocale = getLocale

beforeEach(() => {
  vi.mocked(useModelDownload).mockReturnValue(createModelDownloadController())
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  URL.createObjectURL = vi.fn().mockReturnValue('blob:generated')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  cleanup()
  overwriteGetLocale(originalGetLocale)
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should accept a pasted fullwidth-digit seed like other numeric paste fields', async () => {
  vi.mocked(runImageGeneration).mockResolvedValue({
    blob: new Blob(['png']),
    prompt: 'scene',
  })
  const {result} = renderHook(useImageGeneration)
  await vi.waitFor(() => expect(result.supported()).toBe(true))
  result.setIdea('장면')
  result.setSeed('１２３')
  await result.generate()
  expect(runImageGeneration).toHaveBeenCalled()
  expect(result.error()).toBeNull()
  expect(result.result()?.seed).toBe(123)
})

it('should not report seed validation error for fullwidth maximum seed digits', async () => {
  const {result} = renderHook(useImageGeneration)
  await vi.waitFor(() => expect(result.supported()).toBe(true))
  result.setIdea('장면')
  result.setSeed('４２９４９６７２９５')
  await result.generate()
  expect(result.error()).not.toBe(m.picture_diary_generation_seed_error())
})
