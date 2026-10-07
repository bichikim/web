/** @vitest-environment node */
import type {Wllama} from '@wllama/wllama/esm/index.js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {generateGgufText} from '../generate-gguf-text'
import type {GenerateTextOptions} from '../runtime'

const options: GenerateTextOptions = {
  maximumTokens: 2048,
  messages: [{content: '안녕', role: 'user'}],
  noRepeatNgramSize: 3,
  repetitionPenalty: 1.1,
  temperature: 0.7,
  topK: 40,
  topP: 0.9,
}

beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => undefined))
afterEach(() => vi.restoreAllMocks())

it('should allow reasoning before streaming only the visible answer', async () => {
  const onToken = vi.fn()
  const createChatCompletion = vi.fn(async ({onData}) => {
    onData({choices: [{delta: {reasoning_content: 'private reasoning'}}]})
    onData({choices: [{delta: {content: '</'}}]})
    onData({choices: [{delta: {content: 'think>'}}]})
    onData({choices: [{delta: {content: '안녕'}}]})
    onData({choices: [{delta: {content: '하세요.'}}]})
  })
  const model = {createChatCompletion} as unknown as Wllama

  expect(await generateGgufText({model, options: {...options, onToken}})).toBe('안녕하세요.')
  expect(onToken.mock.calls).toEqual([['안녕'], ['하세요.']])
  expect(createChatCompletion).toHaveBeenCalledOnce()
  expect(createChatCompletion).toHaveBeenCalledWith(
    expect.objectContaining({
      chat_template_kwargs: {enable_thinking: true},
      max_tokens: 4128,
    }),
  )
})

it('should omit repeated reasoning end markers before the visible answer', async () => {
  const onToken = vi.fn()
  const createChatCompletion = vi.fn(async ({onData}) => {
    onData({choices: [{delta: {content: ' \n</think></thi'}}]})
    onData({choices: [{delta: {content: 'nk>\n'}}]})
    onData({choices: [{delta: {content: '첫 카드부터 볼게요.'}}]})
  })
  const model = {createChatCompletion} as unknown as Wllama

  expect(await generateGgufText({model, options: {...options, onToken}})).toBe(
    '첫 카드부터 볼게요.',
  )
  expect(onToken.mock.calls).toEqual([['첫 카드부터 볼게요.']])
})

it('should preserve ordinary angle brackets at the start of an answer', async () => {
  const onToken = vi.fn()
  const createChatCompletion = vi.fn(async ({onData}) => {
    onData({choices: [{delta: {content: '<'}}]})
    onData({choices: [{delta: {content: '예시>입니다.'}}]})
  })
  const model = {createChatCompletion} as unknown as Wllama

  expect(await generateGgufText({model, options: {...options, onToken}})).toBe('<예시>입니다.')
  expect(onToken.mock.calls.flat().join('')).toBe('<예시>입니다.')
})

it('should preserve an ordinary incomplete prefix when the answer ends', async () => {
  const onToken = vi.fn()
  const createChatCompletion = vi.fn(async ({onData}) => {
    onData({choices: [{delta: {content: '<'}}]})
  })
  const model = {createChatCompletion} as unknown as Wllama

  expect(await generateGgufText({model, options: {...options, onToken}})).toBe('<')
  expect(onToken.mock.calls).toEqual([['<']])
})

it('does not start generation when the request was already cancelled', async () => {
  const createChatCompletion = vi.fn()
  const model = {createChatCompletion} as unknown as Wllama
  const signal = AbortSignal.abort()

  await expect(generateGgufText({model, options: {...options, signal}})).rejects.toThrow()
  expect(createChatCompletion).not.toHaveBeenCalled()
})

it('forwards suppressed vocabulary IDs as explicit token bans', async () => {
  const createChatCompletion = vi.fn(async ({onData}) => {
    onData({choices: [{delta: {content: '답변'}}]})
  })
  const model = {createChatCompletion} as unknown as Wllama
  await generateGgufText({model, options: {...options, suppressedTokenIds: [7, 12]}})
  expect(createChatCompletion).toHaveBeenCalledWith(
    expect.objectContaining({logit_bias: {7: false, 12: false}}),
  )
})

it('should retry a reasoning-only completion once without disabling reasoning or streaming it', async () => {
  const onToken = vi.fn()
  const createChatCompletion = vi
    .fn()
    .mockImplementationOnce(async ({onData}) => {
      onData({
        choices: [{delta: {reasoning_content: 'private reasoning'}, finish_reason: 'length'}],
        usage: {completion_tokens: 4128, completion_tokens_details: {reasoning_tokens: 4128}},
      })
    })
    .mockImplementationOnce(async ({onData}) => {
      onData({choices: [{delta: {content: '완성된 해석입니다.'}, finish_reason: 'stop'}]})
    })
  const model = {createChatCompletion} as unknown as Wllama

  expect(await generateGgufText({model, options: {...options, onToken}})).toBe('완성된 해석입니다.')
  expect(onToken.mock.calls).toEqual([['완성된 해석입니다.']])
  expect(createChatCompletion).toHaveBeenCalledTimes(2)
  for (const [request] of createChatCompletion.mock.calls) {
    expect(request.chat_template_kwargs).toEqual({enable_thinking: true})
    expect(request.max_tokens).toBe(4128)
  }
  expect(createChatCompletion.mock.calls[1]?.[0].messages).toEqual([
    ...options.messages,
    expect.objectContaining({role: 'user'}),
  ])
  expect(options.messages).toEqual([{content: '안녕', role: 'user'}])
  expect(console.warn).toHaveBeenCalledWith(
    'GGUF completion ended without a visible answer.',
    expect.objectContaining({
      completionTokens: 4128,
      finishReason: 'length',
      reasoningTokens: 4128,
    }),
  )
})

it.each(['</think>\n \n', ' \n '])(
  'should retry empty content %j without emitting an empty first answer',
  async (content) => {
    const onToken = vi.fn()
    const createChatCompletion = vi
      .fn()
      .mockImplementationOnce(async ({onData}) => {
        onData({choices: [{delta: {content}, finish_reason: 'stop'}]})
      })
      .mockImplementationOnce(async ({onData}) => {
        onData({choices: [{delta: {content: '본문'}}]})
      })
    const model = {createChatCompletion} as unknown as Wllama

    expect(await generateGgufText({model, options: {...options, onToken}})).toBe('본문')
    expect(onToken.mock.calls).toEqual([['본문']])
  },
)

it('should keep a partial visible answer when the token limit is reached without generating it again', async () => {
  const onToken = vi.fn()
  const createChatCompletion = vi.fn(async ({onData}) => {
    onData({choices: [{delta: {content: '현재 상황부터 살펴보면'}, finish_reason: 'length'}]})
  })
  const model = {createChatCompletion} as unknown as Wllama

  expect(await generateGgufText({model, options: {...options, onToken}})).toBe(
    '현재 상황부터 살펴보면',
  )
  expect(createChatCompletion).toHaveBeenCalledOnce()
  expect(onToken.mock.calls).toEqual([['현재 상황부터 살펴보면']])
})

it('should report failure after two empty completions rather than retrying indefinitely', async () => {
  const createChatCompletion = vi.fn(async ({onData}) => {
    onData({choices: [{delta: {reasoning_content: 'private reasoning'}, finish_reason: 'stop'}]})
  })
  const model = {createChatCompletion} as unknown as Wllama

  await expect(generateGgufText({model, options})).rejects.toThrow('답변 본문을 만들지 못했어요')
  expect(createChatCompletion).toHaveBeenCalledTimes(2)
})

it('should not retry when cancellation occurs during the empty completion', async () => {
  const controller = new AbortController()
  const createChatCompletion = vi.fn(async () => controller.abort())
  const model = {createChatCompletion} as unknown as Wllama

  await expect(
    generateGgufText({model, options: {...options, signal: controller.signal}}),
  ).rejects.toThrow()
  expect(createChatCompletion).toHaveBeenCalledOnce()
})

it('should preserve an inference failure without retrying it', async () => {
  const failure = new Error('backend failed')
  const createChatCompletion = vi.fn().mockRejectedValue(failure)
  const model = {createChatCompletion} as unknown as Wllama

  await expect(generateGgufText({model, options})).rejects.toBe(failure)
  expect(createChatCompletion).toHaveBeenCalledOnce()
})
