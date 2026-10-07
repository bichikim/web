import {expect, it, vi} from 'vitest'

import {generateSajuAnswer} from '../generate-answer'
import type {GenerateSajuRequest} from '../messages'

const REQUEST: GenerateSajuRequest = {
  facts: {birthYear: 1995},
  fallbackAnswer: null,
  messages: [{content: '쉬운 말로 답하세요.', role: 'system'}],
  type: 'generate',
}

it('should reject an answer that contradicts the birth year after one rewrite', async () => {
  const generate = vi.fn(async () => '2020년생의 사주입니다.')

  await expect(generateSajuAnswer(REQUEST, generate)).rejects.toThrow(
    '계산 정보나 표현 기준에 맞지 않아',
  )
  expect(generate).toHaveBeenCalledTimes(2)
})

it('should regenerate a plain-language answer before displaying it', async () => {
  const plainAnswer =
    '이 계산만으로 실제 성격을 단정할 수는 없어요. 동료 관계를 살펴보는 분류가 있습니다.\n\n예를 들면 함께 의견을 나누는 장면을 떠올릴 수 있어요.'
  const generate = vi
    .fn(async (_messages: GenerateSajuRequest['messages']) => '')
    .mockResolvedValueOnce('비겁이 1개입니다.')
    .mockResolvedValueOnce(plainAnswer)

  expect(await generateSajuAnswer(REQUEST, generate)).toEqual({
    source: 'model',
    text: plainAnswer,
    type: 'complete',
  })
  expect(generate.mock.calls[1]?.[0][0].content).toContain('명리학 용어')
  expect(generate.mock.calls[1]?.[0][1].content).toBe('비겁이 1개입니다.')
  expect(generate.mock.calls[1]?.[0]).toHaveLength(2)
})

it('should show a calculated explanation when both generated answers miss the readable format', async () => {
  const generate = vi.fn(async () => '돈을 관리하는 능력이 보이지 않습니다.')
  const fallbackAnswer = '이 숫자가 돈을 벌 능력이 없다는 뜻은 아니에요.'

  expect(await generateSajuAnswer({...REQUEST, fallbackAnswer}, generate)).toEqual({
    source: 'calculation',
    text: fallbackAnswer,
    type: 'complete',
  })
  expect(generate).toHaveBeenCalledTimes(2)
})

it('should withhold a confident career claim without an interpretation limit', async () => {
  const generate = vi.fn(
    async () =>
      '직업적으로 자신의 생각을 표현하는 것이 큰 장점입니다. 맡은 일에 책임감을 가지고 처리할 것입니다.',
  )

  await expect(generateSajuAnswer(REQUEST, generate)).rejects.toThrow(
    '계산 정보나 표현 기준에 맞지 않아',
  )
})

it('should separate a valid answer and example into paragraphs', async () => {
  const generate = vi.fn(
    async () =>
      '실제 직업 적성은 사주만으로 알 수 없어요. 맡은 역할을 살펴보는 분류가 있습니다. 예를 들면 함께 정한 약속을 지키는 장면이에요.',
  )

  expect((await generateSajuAnswer(REQUEST, generate)).text).toContain('\n\n예를 들면')
  expect(generate).toHaveBeenCalledTimes(1)
})
