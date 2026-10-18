import type {Answer, Question} from '../../src/types'
import {answerLabel} from './answer-label'

export const highestAnswer = (answer?: Answer, question?: Question) => {
  if (answer === undefined) {
    return null
  }
  const [highest] = Object.entries(answer.probabilities).sort(([, left], [, right]) => right - left)
  if (highest === undefined) {
    return null
  }
  const [label, probability] = highest
  const percentageScale = 100
  return {
    label: answerLabel(label, question),
    probability: `${(probability * percentageScale).toFixed(1)}%`,
  }
}
