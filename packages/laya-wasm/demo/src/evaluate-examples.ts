import {serializeState} from '../../src/sequence'
import {yieldToBrowser} from '../../src/yield-to-browser'
import type {Answer, Question, TrainingExample} from '../../src/types'
import type {EvaluationRow, EvaluationScore} from './types'

export interface EvaluationOptions {
  readonly examples: readonly TrainingExample[]
  readonly predict: (example: TrainingExample) => Promise<Answer>
  readonly signal?: AbortSignal
  readonly onProgress?: (completed: number) => void
}
const labelsFor = (question: Question): readonly string[] => {
  switch (question.type) {
    case 'choice':
      return Array.isArray(question.criteria) ? question.criteria : Object.keys(question.criteria)
    case 'score':
      return question.criteria
    case 'noul':
      return ['false', 'true']
    default: {
      const exhaustive: never = question
      throw new TypeError(`Unknown question: ${String(exhaustive)}`)
    }
  }
}
/** Returns complete top-one accuracy, or null when cancellation interrupts evaluation. */
export const evaluateExamples = async (
  options: EvaluationOptions,
): Promise<EvaluationScore | null> => {
  const rows: EvaluationRow[] = []
  let totalLoss = 0
  for (const example of options.examples) {
    if (options.signal?.aborted) {
      return null
    }
    // The model instance permits one operation at a time.
    // eslint-disable-next-line no-await-in-loop
    const answer = await options.predict(example)
    const labels = labelsFor(example.question)
    const probabilities = labels.map(
      (label, index) =>
        answer.probabilities[example.question.type === 'score' ? String(index) : label],
    )
    if (
      answer.type !== example.question.type ||
      !probabilities.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)
    ) {
      throw new Error('평가 예측이 질문의 선택지와 일치하지 않습니다.')
    }
    const predicted = probabilities.reduce(
      (best, probability, index) => (probability > probabilities[best] ? index : best),
      0,
    )
    const expected = example.target.indexOf(1)
    if (expected < 0) {
      throw new TypeError('평가 정답이 없습니다.')
    }
    totalLoss -= Math.log(Math.max(Number.EPSILON, probabilities[expected]))
    rows.push({
      correct: predicted === expected,
      expected: labels[expected],
      predicted: labels[predicted],
      state: serializeState(example.state),
    })
    options.onProgress?.(rows.length)
    // Process stop requests between examples without timers.
    // eslint-disable-next-line no-await-in-loop
    await yieldToBrowser()
  }
  if (options.signal?.aborted) {
    return null
  }
  return {
    correct: rows.filter((row) => row.correct).length,
    meanLoss: rows.length === 0 ? null : totalLoss / rows.length,
    rows,
    total: rows.length,
  }
}
