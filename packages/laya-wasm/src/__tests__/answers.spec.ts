import {expect, it} from 'vitest'
import {decodeAnswer} from '../index'

it('should exclude padded options and decode the requested answer type', () => {
  const question = {criteria: ['low', 'high'], instructions: 'rate', type: 'score'} as const
  const answer = decodeAnswer(question, [0, 0], 1)
  expect(answer.score).toBe(0.5)
  expect(answer.probabilities).toEqual({0: 0.5, 1: 0.5})
  expect(answer.confidence).toBe(0)
})

it('should preserve extreme finite logits without overflowing the softmax', () => {
  const answer = decodeAnswer({instructions: 'yes?', type: 'noul'}, [-1000, 1000], 1)
  expect(answer.noul).toBe(1)
  expect(answer.confidence).toBe(1)
})
