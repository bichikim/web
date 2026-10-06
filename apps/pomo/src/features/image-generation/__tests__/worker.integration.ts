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
  await scope.onmessage?.({
    data: {idea: '추상화 춤추는 햄버거', modelId: 'gemma-4-e2b', type: 'prompt'},
  })
  expect(scope.postMessage).toHaveBeenCalledWith({
    prompt: 'Abstract art of a dancing hamburger',
    type: 'prompt',
  })
  expect(textGenerate.mock.calls[0]?.[0].messages[0].content).toContain('English')
  expect(textGenerate.mock.calls[0]?.[0].messages[1].content).toBe('추상화 춤추는 햄버거')
})
