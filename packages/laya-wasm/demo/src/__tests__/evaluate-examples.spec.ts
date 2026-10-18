import {expect, it, vi} from 'vitest'
import {evaluateExamples} from '../evaluate-examples'

vi.mock('../../../src/yield-to-browser', () => ({yieldToBrowser: vi.fn()}))
const question = {criteria: ['10', '2'], instructions: 'Pick', type: 'choice'} as const
const examples = [
  {question, state: 'one', target: [1, 0]},
  {question, state: 'two', target: [0, 1]},
]

it('should compute top-one accuracy in criteria order rather than object numeric key order', async () => {
  const predict = vi.fn().mockResolvedValue({
    choice: '10',
    confidence: 0,
    probabilities: {2: 0.2, 10: 0.8},
    type: 'choice',
  })
  const result = await evaluateExamples({examples, predict})
  expect(result).toEqual({
    correct: 1,
    meanLoss: (-Math.log(0.8) - Math.log(0.2)) / 2,
    rows: [
      {correct: true, expected: '10', predicted: '10', state: 'one'},
      {correct: false, expected: '2', predicted: '10', state: 'two'},
    ],
    total: 2,
  })
  expect(predict).toHaveBeenCalledTimes(2)
})

it('should expose improving loss even when the top-one answer stays wrong', async () => {
  const predict = vi
    .fn()
    .mockResolvedValueOnce({probabilities: {2: 0.2, 10: 0.8}, type: 'choice'})
    .mockResolvedValueOnce({probabilities: {2: 0.4, 10: 0.6}, type: 'choice'})
  const before = await evaluateExamples({examples: [examples[1]], predict})
  const after = await evaluateExamples({examples: [examples[1]], predict})
  expect(before?.correct).toBe(0)
  expect(after?.correct).toBe(0)
  expect(before?.meanLoss).toBeCloseTo(-Math.log(0.2))
  expect(after?.meanLoss).toBeLessThan(-Math.log(0.2))
})

it('should report no loss for an empty set and finite loss for a zero-probability target', async () => {
  const predict = vi.fn().mockResolvedValue({probabilities: {2: 0, 10: 1}, type: 'choice'})
  expect(await evaluateExamples({examples: [], predict})).toEqual({
    correct: 0,
    meanLoss: null,
    rows: [],
    total: 0,
  })
  expect((await evaluateExamples({examples: [examples[1]], predict}))?.meanLoss).toBeCloseTo(
    -Math.log(Number.EPSILON),
  )
})

it('should discard incomplete accuracy and stop before the next example on cancellation', async () => {
  const controller = new AbortController()
  const predict = vi.fn().mockImplementation(async () => {
    controller.abort()
    return {choice: '10', confidence: 0, probabilities: {2: 0, 10: 1}, type: 'choice'}
  })
  expect(await evaluateExamples({examples, predict, signal: controller.signal})).toBeNull()
  expect(predict).toHaveBeenCalledOnce()
})

it('should match score and boolean targets to their probability keys', async () => {
  const score = {criteria: ['low', 'high'], instructions: 'Rate', type: 'score'} as const
  expect(
    (
      await evaluateExamples({
        examples: [{question: score, state: 'x', target: [0, 1]}],
        predict: async () => ({
          confidence: 0,
          probabilities: {0: 0.2, 1: 0.8},
          score: 0.8,
          type: 'score',
        }),
      })
    )?.rows[0],
  ).toEqual({correct: true, expected: 'high', predicted: 'high', state: 'x'})
  expect(
    (
      await evaluateExamples({
        examples: [{question: {instructions: 'True?', type: 'noul'}, state: 'x', target: [1, 0]}],
        predict: async () => ({
          confidence: 0,
          noul: 0.1,
          probabilities: {false: 0.9, true: 0.1},
          type: 'noul',
        }),
      })
    )?.correct,
  ).toBe(1)
})
