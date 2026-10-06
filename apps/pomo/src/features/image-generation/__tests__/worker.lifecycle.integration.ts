/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {Flux2KleinPipeline} from '@winter-love/bonsai'
import type {GenerationRequest} from '../messages'

vi.mock('../../text-generation/transformers-runtime', () => ({createTransformersRuntime: vi.fn()}))
vi.mock('@winter-love/bonsai', () => ({Flux2KleinPipeline: {from_pretrained: vi.fn()}}))

// Image worker protocol assertions do not depend on text-model storage discovery.
vi.mock('../../text-generation/download', () => ({isTextModelDownloaded: vi.fn()}))

const scope = {
  onmessage: null as null | ((event: {data: GenerationRequest}) => Promise<void>),
  postMessage: vi.fn(),
}
const generate = vi.fn()
const destroy = vi.fn()

beforeEach(async () => {
  vi.resetModules()
  scope.onmessage = null
  scope.postMessage.mockClear()
  vi.stubGlobal('self', scope)
  vi.mocked(Flux2KleinPipeline.from_pretrained).mockResolvedValue({
    destroy,
    generate,
  } as unknown as Flux2KleinPipeline)
  await import('../worker')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should forward the seed, dimensions and steps to Bonsai and return its PNG blob', async () => {
  const blob = new Blob(['png'], {type: 'image/png'})
  generate.mockResolvedValue({toBlob: () => blob})
  await scope.onmessage?.({
    data: {
      prompt: 'A dancing hamburger',
      settings: {height: 288, seed: 42, steps: 4, variant: 'ternary', width: 512},
      type: 'image',
    },
  })
  expect(scope.postMessage).toHaveBeenCalledWith({blob, type: 'image'})
  expect(Flux2KleinPipeline.from_pretrained).toHaveBeenCalledWith(
    'https://storage.pomofi.io/models/image-generation/prism-ml/bonsai-image-ternary-4B-mlx-2bit/2c24c81b934a658ba5590cf39088ba929985b4a8',
    expect.any(Object),
  )
  expect(generate).toHaveBeenCalledWith(
    expect.objectContaining({
      guidanceScale: 1,
      height: 288,
      numInferenceSteps: 4,
      prompt: 'A dancing hamburger',
      seed: 42,
      width: 512,
    }),
  )
  expect(destroy).toHaveBeenCalledOnce()
})

it('should dispose Bonsai, report an inference failure, and allow a retry', async () => {
  const retryBlob = new Blob(['retry'], {type: 'image/png'})
  generate
    .mockRejectedValueOnce(new Error('GPU memory exhausted'))
    .mockResolvedValueOnce({toBlob: () => retryBlob})
  const request = {
    prompt: 'A burger',
    settings: {height: 512, seed: 0, steps: 4, variant: 'binary' as const, width: 512},
    type: 'image' as const,
  }
  await scope.onmessage?.({
    data: request,
  })
  expect(scope.postMessage).toHaveBeenCalledWith({
    message: 'GPU memory exhausted',
    type: 'error',
  })
  expect(Flux2KleinPipeline.from_pretrained).toHaveBeenCalledWith(
    'https://storage.pomofi.io/models/image-generation/prism-ml/bonsai-image-binary-4B-mlx-1bit/d1b3ac11a7f1ba61d84b277339daeeed4a98e0e2',
    expect.any(Object),
  )
  expect(destroy).toHaveBeenCalledOnce()

  await scope.onmessage?.({
    data: {
      ...request,
      prompt: 'A retry burger',
    },
  })
  expect(scope.postMessage).toHaveBeenCalledWith({blob: retryBlob, type: 'image'})
  expect(Flux2KleinPipeline.from_pretrained).toHaveBeenCalledTimes(2)
  expect(destroy).toHaveBeenCalledTimes(2)
})

it('should reject overlapping image requests and accept a request after the active one finishes', async () => {
  const firstBlob = new Blob(['first'], {type: 'image/png'})
  const secondBlob = new Blob(['second'], {type: 'image/png'})
  let finish: (image: {toBlob: () => Blob}) => void = () => {}
  const generationStarted = Promise.withResolvers<void>()
  generate.mockImplementationOnce(() => {
    generationStarted.resolve()
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  generate.mockResolvedValue({toBlob: () => secondBlob})

  const first = scope.onmessage?.({
    data: {
      prompt: 'A dancing hamburger',
      settings: {height: 288, seed: 42, steps: 4, variant: 'ternary', width: 512},
      type: 'image',
    },
  })
  await scope.onmessage?.({
    data: {
      prompt: 'A sleeping hamburger',
      settings: {height: 288, seed: 43, steps: 4, variant: 'ternary', width: 512},
      type: 'image',
    },
  })
  await generationStarted.promise

  expect(Flux2KleinPipeline.from_pretrained).toHaveBeenCalledOnce()
  expect(scope.postMessage).toHaveBeenCalledWith({
    message: '이미 이미지 생성을 진행하고 있습니다.',
    type: 'error',
  })

  finish({toBlob: () => firstBlob})
  await first
  await scope.onmessage?.({
    data: {
      prompt: 'A smiling hamburger',
      settings: {height: 288, seed: 44, steps: 4, variant: 'ternary', width: 512},
      type: 'image',
    },
  })

  expect(Flux2KleinPipeline.from_pretrained).toHaveBeenCalledTimes(2)
  expect(scope.postMessage).toHaveBeenCalledWith({blob: firstBlob, type: 'image'})
  expect(scope.postMessage).toHaveBeenCalledWith({blob: secondBlob, type: 'image'})
})

it('should prepare and release the image model for the shared downloader without generating an image', async () => {
  await scope.onmessage?.({data: {type: 'prepare-image', variant: 'ternary'}})
  expect(scope.postMessage).toHaveBeenCalledWith({type: 'ready'})
  expect(Flux2KleinPipeline.from_pretrained).toHaveBeenCalledWith(
    'https://storage.pomofi.io/models/image-generation/prism-ml/bonsai-image-ternary-4B-mlx-2bit/2c24c81b934a658ba5590cf39088ba929985b4a8',
    expect.any(Object),
  )
  expect(destroy).toHaveBeenCalledOnce()
  expect(generate).not.toHaveBeenCalled()
})
