/** @vitest-environment node */
import {Flux2KleinPipeline} from '@winter-love/bonsai'
import {afterEach, expect, it, vi} from 'vitest'

import {loadImageModel} from '../features/image-generation/loader'

vi.mock('@winter-love/bonsai', () => ({Flux2KleinPipeline: {from_pretrained: vi.fn()}}))

/** Mirrors `handleGenerationUpdate` in use-image-generation.ts (progress branch). */
const mirrorPictureDiaryGenerationPercentage = (percentage: number | undefined) => percentage

afterEach(() => {
  vi.resetAllMocks()
})

it('should keep picture diary generation progress display within 0..100 percent', async () => {
  vi.mocked(Flux2KleinPipeline.from_pretrained).mockImplementation(async (_model, options) => {
    options.onProgress({loaded: 4, total: 3})
    return {destroy: vi.fn(), generate: vi.fn()}
  })

  let reported: number | undefined
  await loadImageModel({
    onProgress: (update) => {
      reported = update.percentage
    },
    variant: 'ternary',
  })

  expect(reported).toBe(133)
  expect(mirrorPictureDiaryGenerationPercentage(reported)).toBeLessThanOrEqual(100)
})
