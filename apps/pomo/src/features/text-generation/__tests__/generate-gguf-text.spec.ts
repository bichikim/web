/** @vitest-environment node */
import type {Wllama} from '@wllama/wllama/esm/index.js'
import {expect, it, vi} from 'vitest'

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

it('streams only visible answer content and combines it into the final answer', async () => {
  const onToken = vi.fn()
  const createChatCompletion = vi.fn(async ({onData}) => {
    onData({choices: [{delta: {reasoning_content: 'private reasoning'}}]})
    onData({choices: [{delta: {content: '안녕'}}]})
    onData({choices: [{delta: {content: '하세요.'}}]})
  })
  const model = {createChatCompletion} as unknown as Wllama

  expect(await generateGgufText({model, options: {...options, onToken}})).toBe('안녕하세요.')
  expect(onToken.mock.calls).toEqual([['안녕'], ['하세요.']])
})

it('does not start generation when the request was already cancelled', async () => {
  const createChatCompletion = vi.fn()
  const model = {createChatCompletion} as unknown as Wllama
  const signal = AbortSignal.abort()

  await expect(generateGgufText({model, options: {...options, signal}})).rejects.toThrow()
  expect(createChatCompletion).not.toHaveBeenCalled()
})

it('forwards suppressed vocabulary IDs as explicit token bans', async () => {
  const createChatCompletion = vi.fn(async () => undefined)
  const model = {createChatCompletion} as unknown as Wllama
  await generateGgufText({model, options: {...options, suppressedTokenIds: [7, 12]}})
  expect(createChatCompletion).toHaveBeenCalledWith(
    expect.objectContaining({logit_bias: {7: false, 12: false}}),
  )
})
