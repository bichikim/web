import {expect, it} from 'vitest'
import {highestAnswer} from '../highest-answer'

it('should show the score criterion instead of its internal numeric key', () => {
  const answer = {
    confidence: 0.1,
    probabilities: {0: 0.2, 1: 0.8},
    score: 0.8,
    type: 'score',
  } as const
  const question = {
    criteria: ['낮음', '높음'],
    instructions: '정도를 판단하세요.',
    type: 'score',
  } as const
  expect(highestAnswer(answer, question)).toEqual({label: '높음', probability: '80.0%'})
})

it('should preserve choice and boolean labels and handle absent results', () => {
  expect(highestAnswer()).toBeNull()
  expect(
    highestAnswer({
      choice: '송금 실패',
      confidence: 0.1,
      probabilities: {'개인정보 변경': 0.2, '송금 실패': 0.8},
      type: 'choice',
    }),
  ).toEqual({label: '송금 실패', probability: '80.0%'})
  expect(
    highestAnswer({
      confidence: 0.1,
      noul: 0.9,
      probabilities: {false: 0.1, true: 0.9},
      type: 'noul',
    }),
  ).toEqual({label: 'true', probability: '90.0%'})
})
