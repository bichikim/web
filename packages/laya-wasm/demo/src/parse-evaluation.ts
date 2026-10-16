import type {TrainingExample} from '../../src/types'
import {parseTrainingJsonl} from './training-jsonl'

export const parseEvaluation = (text: string): readonly TrainingExample[] => {
  const examples = parseTrainingJsonl(text)
  if (
    examples.some(
      ({target}) =>
        target.filter((value) => value === 1).length !== 1 ||
        target.some((value) => value !== 0 && value !== 1),
    )
  ) {
    throw new TypeError('평가 예제에는 정답 하나를 1로 지정하세요. 확률 분포는 평가할 수 없습니다.')
  }
  return examples
}
