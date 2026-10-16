import {validateEvaluationSplit} from './validate-evaluation-split'
import type {TrainingCommand} from './types'

export const validateTrainingCommand = (command: TrainingCommand): void => {
  const maximumEpochs = 1000
  if (
    command.examples.length === 0 ||
    !Number.isInteger(command.epochs) ||
    command.epochs < 1 ||
    command.epochs > maximumEpochs ||
    !Number.isFinite(command.learningRate) ||
    command.learningRate <= 0
  ) {
    throw new TypeError('예제를 추가하고 학습 횟수(1–1000)와 양수 학습률을 입력하세요.')
  }
  validateEvaluationSplit(command.examples, command.evaluation ?? [])
}
