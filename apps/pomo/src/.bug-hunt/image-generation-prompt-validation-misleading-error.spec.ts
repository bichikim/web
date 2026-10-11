/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createTransformersRuntime} from '../features/text-generation/transformers-runtime'
import {Flux2KleinPipeline} from '@winter-love/bonsai'
import type {GenerationRequest} from '../features/image-generation/messages'

vi.mock('../features/text-generation/transformers-runtime', () => ({
  createTransformersRuntime: vi.fn(),
}))
vi.mock('@winter-love/bonsai', () => ({Flux2KleinPipeline: {from_pretrained: vi.fn()}}))

const scope = {
  onmessage: null as null | ((event: {data: GenerationRequest}) => Promise<void>),
  postMessage: vi.fn(),
}

beforeEach(async () => {
  vi.resetModules()
  scope.onmessage = null
  scope.postMessage.mockClear()
  vi.stubGlobal('self', scope)
  vi.mocked(Flux2KleinPipeline.from_pretrained).mockResolvedValue({
    destroy: vi.fn(),
    generate: vi.fn(),
  } as unknown as Flux2KleinPipeline)
  await import('../features/image-generation/worker')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const findErrorMessage = (): string | undefined => {
  const call = scope.postMessage.mock.calls.find(([payload]) => payload?.type === 'error')
  return call?.[0]?.message as string | undefined
}

it('should not ask for a more specific idea when the model returns a detailed Korean prompt', async () => {
  const detailedKoreanPrompt =
    '봄날 공원 벚꽃길을 걷는 골든 리트리버가 공을 물고 달리는 초상화풍 장면'
  vi.mocked(createTransformersRuntime).mockReturnValue({
    countTokens: vi.fn(),
    generate: vi.fn().mockResolvedValue(detailedKoreanPrompt),
    getTokenizer: vi.fn(),
    prepare: vi.fn().mockResolvedValue(undefined),
  })

  await scope.onmessage?.({
    data: {idea: '봄날 공원에서 골든 리트리버', modelId: 'gemma-4-e2b', type: 'prompt'},
  })

  const message = findErrorMessage()
  expect(message).toBeDefined()
  expect(message).not.toMatch(/구체적으로/u)
  expect(message).toMatch(/영어|English/u)
})

it('should not ask for a more specific idea when the model returns digits without Latin letters', async () => {
  vi.mocked(createTransformersRuntime).mockReturnValue({
    countTokens: vi.fn(),
    generate: vi.fn().mockResolvedValue('12345'),
    getTokenizer: vi.fn(),
    prepare: vi.fn().mockResolvedValue(undefined),
  })

  await scope.onmessage?.({
    data: {idea: 'spring park golden retriever', modelId: 'gemma-4-e2b', type: 'prompt'},
  })

  const message = findErrorMessage()
  expect(message).toBeDefined()
  expect(message).not.toMatch(/구체적으로/u)
})
