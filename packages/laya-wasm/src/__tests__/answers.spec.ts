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

it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
  'should reject an invalid temperature of %s',
  (temperature) => {
    expect(() => decodeAnswer({instructions: 'yes?', type: 'noul'}, [0, 0], temperature)).toThrow(
      new TypeError('Temperatures must be positive finite numbers.'),
    )
  },
)

it.each([0.5, 2])(
  'should calibrate probabilities with a positive temperature of %s',
  (temperature) => {
    const answer = decodeAnswer({instructions: 'yes?', type: 'noul'}, [0, Math.log(3)], temperature)
    const expected = 1 / (1 + 3 ** (-1 / temperature))
    expect(answer.noul).toBeCloseTo(expected)
    expect(answer.probabilities.true).toBeCloseTo(expected)
    expect(answer.probabilities.false).toBeCloseTo(1 - expected)
    expect(Number.isFinite(answer.confidence)).toBe(true)
  },
)
