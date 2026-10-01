/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {useModelDownload} from 'src/features/model-download'
import {createModelDownloadController} from 'src/features/model-download/controller'
import {runImageGeneration} from '../features/image-generation/client'
import {useImageGeneration} from '../features/image-generation/use-image-generation'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('../features/image-generation/client', () => ({runImageGeneration: vi.fn()}))

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
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should accept a seed pasted with fullwidth digits', async () => {
  vi.mocked(runImageGeneration).mockResolvedValue({
    blob: new Blob(['png']),
    prompt: 'test',
  })
  const {result} = renderHook(useImageGeneration)
  await vi.waitFor(() => expect(result.supported()).toBe(true))
  result.setIdea('test')
  result.setSeed('１２３')
  await result.generate()
  expect(runImageGeneration).toHaveBeenCalled()
  expect(result.error()).not.toBe(m.picture_diary_generation_seed_error())
  expect(result.result()?.seed).toBe(123)
})
