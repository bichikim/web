/** @vitest-environment jsdom */
import {AutoConfig, AutoModel, AutoTokenizer} from '@huggingface/transformers'
import {afterEach, expect, it, vi} from 'vitest'
import type {SemanticReply, SemanticRequest} from '../protocol'

vi.mock('@huggingface/transformers', async () => {
  const actual = await vi.importActual<typeof import('@huggingface/transformers')>(
    '@huggingface/transformers',
  )
  return {
    ...actual,
    AutoConfig: {from_pretrained: vi.fn()},
    AutoModel: {from_pretrained: vi.fn()},
    AutoTokenizer: {from_pretrained: vi.fn()},
  }
})
const previous = globalThis.onmessage
afterEach(() => {
  globalThis.onmessage = previous
  vi.unstubAllGlobals()
  vi.resetAllMocks()
  vi.resetModules()
})

it('should embed uncached texts individually and retain duplicate order and cache hits', async () => {
  const tokenizer = vi.fn((texts: readonly string[]) => ({texts}))
  const model = vi.fn(async (tokens: {readonly texts: readonly string[]}) => ({
    sentence_embedding: {
      tolist: () => tokens.texts.map((text) => Array.from({length: 768}, () => text.length)),
    },
  }))
  vi.mocked(AutoConfig.from_pretrained).mockResolvedValue(
    {} as Awaited<ReturnType<typeof AutoConfig.from_pretrained>>,
  )
  vi.mocked(AutoTokenizer.from_pretrained).mockResolvedValue(
    tokenizer as unknown as Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>,
  )
  vi.mocked(AutoModel.from_pretrained).mockResolvedValue(
    model as unknown as Awaited<ReturnType<typeof AutoModel.from_pretrained>>,
  )
  const post = vi.fn()
  vi.stubGlobal('postMessage', post)
  await import('../worker')
  const send = (texts: readonly string[]) => {
    const reply = Promise.withResolvers<SemanticReply>()
    post.mockImplementationOnce(reply.resolve)
    globalThis.onmessage?.call(
      globalThis.window,
      new MessageEvent<SemanticRequest>('message', {
        data: {id: 1, modelPath: '/models/', runtimePath: '/runtime/', texts},
      }),
    )
    return reply.promise
  }
  const result = await send(['long chat', 'short label', 'short label'])
  expect(result.type).toBe('vectors')
  expect(tokenizer.mock.calls.map(([texts]) => texts)).toEqual([['long chat'], ['short label']])
  if (result.type !== 'vectors') {
    throw new Error(result.message)
  }
  expect(result.vectors.map((vector) => vector[0])).toEqual([9, 11, 11])
  await send(['short label', 'long chat'])
  expect(model).toHaveBeenCalledTimes(2)
  const descriptions = Array.from({length: 1026}, (_, index) => `example-${index}`)
  const large = await send(descriptions)
  expect(large.type).toBe('vectors')
  if (large.type !== 'vectors') {
    throw new Error(large.message)
  }
  expect(large.vectors.map((vector) => vector[0])).toEqual(descriptions.map((text) => text.length))
})
