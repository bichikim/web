import {expect, it, vi} from 'vitest'

import {generateSajuAnswer} from '../generate-answer'
import type {GenerateSajuRequest} from '../messages'

const REQUEST: GenerateSajuRequest = {
  messages: [{content: '사주 질문과 계산값', role: 'user'}],
  type: 'generate',
}

it('should display the first model answer without inspecting or rewriting its content', async () => {
  const generated = '2020년생은 비겁이 2개입니다.\n예시 문구 없이 답합니다.'
  const generate = vi.fn(async () => generated)

  expect(await generateSajuAnswer(REQUEST, generate)).toEqual({
    text: generated,
    type: 'complete',
  })
  expect(generate).toHaveBeenCalledExactlyOnceWith(REQUEST.messages)
})

it('should return an empty model response without a content check', async () => {
  const generate = vi.fn(async () => '')

  expect(await generateSajuAnswer(REQUEST, generate)).toEqual({text: '', type: 'complete'})
  expect(generate).toHaveBeenCalledTimes(1)
})
