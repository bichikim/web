import {expect, it, vi} from 'vitest'
import {trainAndEvaluate} from '../train-and-evaluate'

vi.mock('../../../src/yield-to-browser', () => ({yieldToBrowser: vi.fn()}))
const question = {criteria: ['a', 'b'], instructions: 'Pick', type: 'choice'} as const
const training = [{question, state: 'training', target: [0, 1]}]
const evaluation = [{question, state: 'held out', target: [0, 1]}]
const command = {
  epochs: 1,
  evaluation,
  examples: training,
  learningRate: 0.001,
  prompt: {question, state: 'editor'},
  type: 'train',
} as const

it('should evaluate the same held-out examples before and after training without training on them', async () => {
  let trained = false
  const systemOne = vi.fn().mockImplementation(async () => ({
    answers: {
      answer: {
        choice: trained ? 'b' : 'a',
        confidence: 0,
        probabilities: trained ? {a: 0.2, b: 0.8} : {a: 0.8, b: 0.2},
        type: 'choice',
      },
    },
    inputTokens: 1,
  }))
  const train = vi.fn().mockImplementation(async () => {
    trained = true
    return {meanLoss: 0.2, status: 'completed', steps: 1}
  })
  const report = await trainAndEvaluate({
    command,
    model: {systemOne, train},
    onEvaluation: vi.fn(),
    onProgress: vi.fn(),
    signal: new AbortController().signal,
  })
  expect(train).toHaveBeenCalledWith(
    training,
    expect.objectContaining({epochs: 1, learningRate: 0.001}),
  )
  expect(report.evaluation?.before.correct).toBe(0)
  expect(report.evaluation?.after.correct).toBe(1)
  expect(systemOne.mock.calls.map(([state]) => state)).toEqual([
    'editor',
    'held out',
    'editor',
    'held out',
  ])
})

it('should cancel before training and not publish partial accuracy', async () => {
  const controller = new AbortController()
  const systemOne = vi.fn().mockResolvedValue({
    answers: {
      answer: {choice: 'a', confidence: 0, probabilities: {a: 0.8, b: 0.2}, type: 'choice'},
    },
    inputTokens: 1,
  })
  const train = vi.fn()
  controller.abort()
  const report = await trainAndEvaluate({
    command,
    model: {systemOne, train},
    onEvaluation: vi.fn(),
    onProgress: vi.fn(),
    signal: controller.signal,
  })
  expect(train).not.toHaveBeenCalled()
  expect(report.evaluation).toBeNull()
  expect(report.result.status).toBe('cancelled')
})

it('should reject overlapping splits before inference or weight updates', async () => {
  const model = {systemOne: vi.fn(), train: vi.fn()}
  await expect(
    trainAndEvaluate({
      command: {...command, evaluation: training},
      model,
      onEvaluation: vi.fn(),
      onProgress: vi.fn(),
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow(/학습 데이터/)
  expect(model.systemOne).not.toHaveBeenCalled()
  expect(model.train).not.toHaveBeenCalled()
})
it('should keep training available when the evaluation list is empty', async () => {
  const systemOne = vi.fn().mockResolvedValue({
    answers: {answer: {choice: 'a', confidence: 0, probabilities: {a: 1, b: 0}, type: 'choice'}},
    inputTokens: 1,
  })
  const train = vi.fn().mockResolvedValue({meanLoss: 0.2, status: 'completed', steps: 1})
  const report = await trainAndEvaluate({
    command: {...command, evaluation: []},
    model: {systemOne, train},
    onEvaluation: vi.fn(),
    onProgress: vi.fn(),
    signal: new AbortController().signal,
  })
  expect(report.result.status).toBe('completed')
  expect(report.evaluation).toBeNull()
  expect(systemOne).toHaveBeenCalledTimes(2)
})
it('should preserve completed weight updates but discard accuracy when final evaluation is cancelled', async () => {
  const controller = new AbortController()
  const systemOne = vi.fn().mockResolvedValue({
    answers: {answer: {choice: 'a', confidence: 0, probabilities: {a: 1, b: 0}, type: 'choice'}},
    inputTokens: 1,
  })
  const train = vi.fn().mockImplementation(async () => {
    controller.abort()
    return {meanLoss: 0.2, status: 'completed', steps: 1}
  })
  const report = await trainAndEvaluate({
    command,
    model: {systemOne, train},
    onEvaluation: vi.fn(),
    onProgress: vi.fn(),
    signal: controller.signal,
  })
  expect(report.result).toEqual({meanLoss: 0.2, status: 'cancelled', steps: 1})
  expect(report.evaluation).toBeNull()
  expect(train).toHaveBeenCalledOnce()
})
