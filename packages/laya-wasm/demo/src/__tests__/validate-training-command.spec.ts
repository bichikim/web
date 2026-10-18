import {expect, it} from 'vitest'
import {validateTrainingCommand} from '../validate-training-command'
import type {TrainingCommand} from '../types'

const question = {criteria: ['a', 'b'], instructions: 'Pick', type: 'choice'} as const
const example = {question, state: 'training', target: [1, 0]}
const command: TrainingCommand = {
  epochs: 1,
  evaluation: [{...example, state: 'held out'}],
  examples: [example],
  learningRate: 0.001,
  prompt: {question, state: 'editor'},
  type: 'train',
}
it('should accept a separate evaluation set and require usable training settings', () => {
  expect(() => validateTrainingCommand(command)).not.toThrow()
  expect(() => validateTrainingCommand({...command, epochs: 0})).toThrow(/학습 횟수/)
  expect(() => validateTrainingCommand({...command, examples: []})).toThrow(/예제/)
  expect(() => validateTrainingCommand({...command, learningRate: NaN})).toThrow(/학습률/)
})
it('should reject overlapping sentences before a training command is sent', () => {
  expect(() => validateTrainingCommand({...command, evaluation: [example]})).toThrow(/학습 데이터/)
})
