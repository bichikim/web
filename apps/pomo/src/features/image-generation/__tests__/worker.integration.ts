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

it.each([
  '봄날 벚꽃길에서 공을 물고 달리는 골든 리트리버의 수채화',
  'A watercolor painting of 봄날 벚꽃길',
  '春天公園裡拿著球奔跑的金毛犬',
  '12345',
  '   ',
])(
  'should identify a rejected model prompt without asking for a more detailed idea: %s',
  async (output) => {
    vi.mocked(createTransformersRuntime).mockReturnValue({
      countTokens: vi.fn(),
      generate: vi.fn().mockResolvedValue(output),
      getTokenizer: vi.fn(),
      prepare: vi.fn().mockResolvedValue(undefined),
    })

    await scope.onmessage?.({
      data: {
        idea: '봄날 벚꽃길에서 골든 리트리버가 공을 물고 달리는 수채화',
        modelId: 'gemma-4-e2b',
        type: 'prompt',
      },
    })

    const response = scope.postMessage.mock.calls.find(([message]) => message.type === 'error')?.[0]
    expect(response).toEqual({
      message: '이미지 생성을 위한 영어 프롬프트를 만들지 못했어요. 다시 시도해 주세요.',
      type: 'error',
    })
    expect(scope.postMessage.mock.calls.some(([message]) => message.type === 'prompt')).toBe(false)
    expect(Flux2KleinPipeline.from_pretrained).not.toHaveBeenCalled()
  },
)

it('should accept an English model retry for the same unchanged idea after rejecting a Korean prompt', async () => {
  const idea = '봄날 벚꽃길에서 골든 리트리버가 공을 물고 달리는 수채화'
  const prompt =
    'A watercolor painting of a golden retriever running with a ball under spring blossoms'
  const textGenerate = vi.fn().mockResolvedValueOnce(idea).mockResolvedValueOnce(prompt)
  vi.mocked(createTransformersRuntime).mockReturnValue({
    countTokens: vi.fn(),
    generate: textGenerate,
    getTokenizer: vi.fn(),
    prepare: vi.fn().mockResolvedValue(undefined),
  })

  await scope.onmessage?.({data: {idea, modelId: 'gemma-4-e2b', type: 'prompt'}})
  expect(scope.postMessage.mock.calls.some(([message]) => message.type === 'error')).toBe(true)
  scope.postMessage.mockClear()
  await scope.onmessage?.({data: {idea, modelId: 'gemma-4-e2b', type: 'prompt'}})

  expect(scope.postMessage).toHaveBeenCalledWith({prompt, type: 'prompt'})
  expect(scope.postMessage.mock.calls.some(([message]) => message.type === 'error')).toBe(false)
  expect(textGenerate.mock.calls.map(([request]) => request.messages[1].content)).toEqual([
    idea,
    idea,
  ])
})
