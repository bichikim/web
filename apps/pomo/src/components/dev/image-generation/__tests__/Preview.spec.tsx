/** @vitest-environment jsdom */
import {useModelDownload} from 'src/features/model-download'
import {createModelDownloadController} from 'src/features/model-download/controller'
vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {type ImageGenerationController, useImageGeneration} from 'src/features/image-generation'
import {runImageGeneration} from 'src/features/image-generation/client'
import {Preview} from '../Preview'

vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should keep the displayed image paired with its original prompt when the next generation fails', async () => {
  vi.mocked(useModelDownload).mockReturnValue(createModelDownloadController())
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:first')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.mocked(runImageGeneration)
    .mockImplementationOnce(async (options) => {
      options.onUpdate({prompt: 'First scene', type: 'prompt'})
      return {blob: new Blob(['png']), prompt: 'First scene'}
    })
    .mockImplementationOnce(async (options) => {
      options.onUpdate({prompt: 'Second scene', type: 'prompt'})
      throw new Error('GPU failed')
    })
  let studio: ImageGenerationController | undefined
  render(() => {
    studio = useImageGeneration()
    return <Preview studio={studio} />
  })
  await vi.waitFor(() => expect(studio?.supported()).toBe(true))
  studio?.setIdea('첫 장면')
  await studio?.generate()
  studio?.setIdea('두 번째 장면')
  await studio?.generate()
  expect(studio?.error()).toBe('GPU failed')
  expect(screen.getByRole('img').getAttribute('alt')).toBe('First scene')
  expect(screen.getByText('First scene').textContent).toBe('First scene')
  expect(screen.getByText('Second scene').textContent).toBe('Second scene')
})
