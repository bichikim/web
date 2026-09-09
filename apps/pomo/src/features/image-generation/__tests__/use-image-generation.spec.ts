/** @vitest-environment jsdom */
import {type ModelDownloadItem, useModelDownload} from 'src/features/model-download'
import {createModelDownloadController} from 'src/features/model-download/controller'
vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))

import {createSignal} from 'solid-js'
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {runImageGeneration} from '../client'
import {useImageGeneration} from '../use-image-generation'

vi.mock('../client', () => ({runImageGeneration: vi.fn()}))

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

it('should preserve the generated image metadata and revoke its URL on disposal', async () => {
  vi.mocked(runImageGeneration).mockResolvedValue({
    blob: new Blob(['png']),
    prompt: 'A dancing hamburger',
  })
  const {result} = renderHook(useImageGeneration)
  await vi.waitFor(() => expect(result.supported()).toBe(true))
  result.setIdea('춤추는 햄버거')
  result.setSeed('123')
  result.selectRatio('16:9')
  await result.generate()
  expect(result.result()).toMatchObject({height: 288, seed: 123, url: 'blob:generated', width: 512})
  expect(result.result()?.blob).toBe(
    vi.mocked(runImageGeneration).mock.settledResults[0]?.value.blob,
  )
  expect(result.busy()).toBe(false)
  cleanup()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:generated')
})

it('should abort pending work and ignore late completion after stopping', async () => {
  let finish: ((image: {blob: Blob; prompt: string}) => void) | undefined
  vi.mocked(runImageGeneration).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const {result} = renderHook(useImageGeneration)
  await vi.waitFor(() => expect(result.supported()).toBe(true))
  result.setIdea('햄버거')
  const pending = result.generate()
  expect(result.busy()).toBe(true)
  const options = vi.mocked(runImageGeneration).mock.calls[0]?.[0]
  result.stop()
  expect(options?.signal.aborted).toBe(true)
  finish?.({blob: new Blob(['png']), prompt: 'A burger'})
  await pending
  expect(result.result()).toBe(null)
  expect(result.error()).toBe(null)
  expect(result.busy()).toBe(false)
})

it('should surface a failure and allow another generation', async () => {
  vi.mocked(runImageGeneration).mockRejectedValue(new Error('Download failed'))
  const {result} = renderHook(useImageGeneration)
  await vi.waitFor(() => expect(result.supported()).toBe(true))
  result.setIdea('햄버거')
  await result.generate()
  expect(result.error()).toBe('Download failed')
  expect(result.busy()).toBe(false)
  vi.mocked(runImageGeneration).mockResolvedValue({
    blob: new Blob(['png']),
    prompt: 'A hamburger',
  })
  await result.generate()
  expect(result.error()).toBe(null)
  expect(result.result()?.prompt).toBe('A hamburger')
  expect(result.busy()).toBe(false)
})

it('should report its model download progress and restore inference status afterward', async () => {
  const controller = createModelDownloadController()
  const [items, setItems] = createSignal<readonly ModelDownloadItem[]>([])
  vi.spyOn(controller, 'downloads').mockImplementation(items)
  vi.mocked(useModelDownload).mockReturnValue(controller)
  const {result} = renderHook(useImageGeneration)
  const pending = Promise.withResolvers<{blob: Blob; prompt: string}>()
  vi.mocked(runImageGeneration).mockReturnValue(pending.promise)
  await vi.waitFor(() => expect(result.supported()).toBe(true))
  result.setIdea('산책')
  result.setSeed('123')
  setItems([
    {label: 'Voice', percentage: 90, status: 'loading', target: {kind: 'voice', modelId: 'full'}},
    {
      label: 'Bonsai',
      percentage: 15,
      status: 'loading',
      target: {kind: 'image', modelId: 'ternary'},
    },
  ])
  const task = result.generate()
  expect(result.status()).toContain('Bonsai')
  expect(result.percentage()).toBe(15)
  vi.mocked(runImageGeneration).mock.lastCall![0].onUpdate({
    label: '이미지 생성 중',
    percentage: 25,
    type: 'progress',
  })
  setItems([])
  expect(result.status()).toBe('이미지 생성 중')
  expect(result.percentage()).toBe(25)
  result.stop()
  expect(result.status()).toBe('생성을 중지했어요.')
  expect(result.percentage()).toBeUndefined()
  pending.resolve({blob: new Blob(['png']), prompt: 'A walk'})
  await task
})
