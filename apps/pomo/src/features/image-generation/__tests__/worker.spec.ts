/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createTransformersRuntime} from '../../text-generation/transformers-runtime'
import {Flux2KleinPipeline} from '@winter-love/bonsai'
import type {GenerationRequest} from '../messages'

vi.mock('../../text-generation/transformers-runtime', () => ({createTransformersRuntime: vi.fn()}))
vi.mock('@winter-love/bonsai', () => ({Flux2KleinPipeline: {from_pretrained: vi.fn()}}))

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

it('should use the existing chat runtime with English image instructions and return its prompt', async () => {
  const textGenerate = vi.fn().mockResolvedValue('Abstract art of a dancing hamburger')
  vi.mocked(createTransformersRuntime).mockReturnValue({
    countTokens: vi.fn(),
    generate: textGenerate,
    getTokenizer: vi.fn(),
    prepare: vi.fn().mockResolvedValue(undefined),
  })
  scope.onmessage?.({data: {idea: '추상화 춤추는 햄버거', modelId: 'gemma-4-e2b', type: 'prompt'}})
  await vi.waitFor(() =>
    expect(scope.postMessage).toHaveBeenCalledWith({
      prompt: 'Abstract art of a dancing hamburger',
      type: 'prompt',
    }),
  )
  expect(textGenerate.mock.calls[0]?.[0].messages[0].content).toContain('English')
  expect(textGenerate.mock.calls[0]?.[0].messages[1].content).toBe('추상화 춤추는 햄버거')
})

it('should forward the seed, dimensions and steps to Bonsai and return its PNG blob', async () => {
  const blob = new Blob(['png'], {type: 'image/png'})
  generate.mockResolvedValue({toBlob: () => blob})
  scope.onmessage?.({
    data: {
      prompt: 'A dancing hamburger',
      settings: {height: 288, seed: 42, steps: 4, variant: 'ternary', width: 512},
      type: 'image',
    },
  })
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenCalledWith({blob, type: 'image'}))
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
  generate.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
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

  await vi.waitFor(() => expect(Flux2KleinPipeline.from_pretrained).toHaveBeenCalledOnce())
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
  scope.onmessage?.({data: {type: 'prepare-image', variant: 'ternary'}})
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenCalledWith({type: 'ready'}))
  expect(Flux2KleinPipeline.from_pretrained).toHaveBeenCalledWith(
    'https://storage.pomofi.io/models/image-generation/prism-ml/bonsai-image-ternary-4B-mlx-2bit/2c24c81b934a658ba5590cf39088ba929985b4a8',
    expect.any(Object),
  )
  expect(destroy).toHaveBeenCalledOnce()
  expect(generate).not.toHaveBeenCalled()
})
