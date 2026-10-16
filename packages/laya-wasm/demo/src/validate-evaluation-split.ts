import {serializeState} from '../../src/sequence'
import type {TrainingExample} from '../../src/types'

const sentenceKey = (example: TrainingExample): string =>
  serializeState(example.state).trim().replace(/\s+/gu, ' ').toLowerCase()

export const validateEvaluationSplit = (
  training: readonly TrainingExample[],
  evaluation: readonly TrainingExample[],
): void => {
  const trained = new Set(training.map(sentenceKey))
  if (evaluation.some((example) => trained.has(sentenceKey(example)))) {
    throw new TypeError('평가 문장이 학습 데이터에도 있습니다. 중복 문장을 제거하세요.')
  }
}
