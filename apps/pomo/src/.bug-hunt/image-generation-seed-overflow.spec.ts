/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('@paraglide/message', () => ({
  picture_diary_generation_checking: () => 'checking',
  picture_diary_generation_complete: () => 'complete',
  picture_diary_generation_check_settings: () => 'check settings',
  picture_diary_generation_error: () => 'error',
  picture_diary_generation_seed_error: () =>
    '시드는 0–4,294,967,295 사이의 정수로 입력해 주세요.',
  picture_diary_generation_stopped: () => 'stopped',
}))
vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))
vi.mock('src/features/image-generation/use-support', () => ({
  useImageSupport: () => () => true,
}))
vi.mock('src/features/model-download', () => ({
  useModelDownload: () => ({downloads: () => []}),
}))

import {runImageGeneration} from '../features/image-generation/client'
import {useImageGeneration} from '../features/image-generation/use-image-generation'

afterEach(() => {
  vi.restoreAllMocks()
})

it('should reject seed values above the documented uint32 maximum before generation', async () => {
  const view = renderHook(() => useImageGeneration())
  view.result.setSeed('4294967296')
  view.result.setIdea('test scene')
  view.result.setStyle('none')
  view.result.selectRatio('1:1')

  await view.result.generate()

  expect(runImageGeneration).not.toHaveBeenCalled()
  expect(view.result.error()).toContain('시드')
  view.cleanup()
})
