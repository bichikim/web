import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createTransformersRuntime} from '../../text-generation/transformers-runtime'
import {Flux2KleinPipeline} from '../vendor/runtime.mjs'
import type {GenerationRequest} from '../messages'

vi.mock('../../text-generation/transformers-runtime', () => ({createTransformersRuntime: vi.fn()}))
vi.mock('../vendor/runtime.mjs', () => ({Flux2KleinPipeline: {from_pretrained: vi.fn()}}))

const scope = {
  onmessage: null as null | ((event: {data: GenerationRequest}) => void),
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

it('should dispose Bonsai and report an inference failure', async () => {
  generate.mockRejectedValue(new Error('GPU memory exhausted'))
  scope.onmessage?.({
    data: {
      prompt: 'A burger',
      settings: {height: 512, seed: 0, steps: 4, variant: 'binary', width: 512},
      type: 'image',
    },
  })
  await vi.waitFor(() =>
    expect(scope.postMessage).toHaveBeenCalledWith({
      message: 'GPU memory exhausted',
      type: 'error',
    }),
  )
  expect(destroy).toHaveBeenCalledOnce()
})
