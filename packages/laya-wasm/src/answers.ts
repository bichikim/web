import {renderOptions} from './sequence'
import type {Answer, Calibration, Question} from './types'

export const questionTemperature = (question: Question, config: Calibration): number => {
  const count = renderOptions(question).length
  const mediumOptions = 5
  const largeOptions = 10
  const bucket =
    count <= 2 ? '2' : count <= mediumOptions ? '3-5' : count <= largeOptions ? '6-10' : '11+'
  const index = {choice: 0, noul: 2, score: 1}[question.type]
  return config.optionTemperatures[`${question.type}:${bucket}`] ?? config.temperature[index] ?? 1
}

export const decodeAnswer = (
  question: Question,
  logits: readonly number[],
  temperature: number,
): Answer => {
  if (!Number.isFinite(temperature) || temperature <= 0) {
    throw new TypeError('Temperatures must be positive finite numbers.')
  }
  if (logits.length !== renderOptions(question).length || !logits.every(Number.isFinite)) {
    throw new Error('Unexpected scorer output.')
  }
  const maximum = Math.max(...logits)
  const exponential = logits.map((value) => Math.exp((value - maximum) / temperature))
  const total = exponential.reduce((sum, value) => sum + value, 0)
  const probabilities = exponential.map((value) => value / total)
  const minimumProbability = 1e-12
  const entropy = -probabilities.reduce(
    (sum, value) => sum + value * Math.log(Math.max(value, minimumProbability)),
    0,
  )
  const confidence = 1 - entropy / Math.log(probabilities.length)
  switch (question.type) {
    case 'choice': {
      const {criteria} = question
      const keys: readonly string[] = Array.isArray(criteria) ? criteria : Object.keys(criteria)
      const best = probabilities.indexOf(Math.max(...probabilities))
      return {
        choice: keys[best],
        confidence,
        probabilities: Object.fromEntries(keys.map((key, index) => [key, probabilities[index]])),
        type: 'choice',
      }
    }
    case 'score':
      return {
        confidence,
        probabilities: Object.fromEntries(
          probabilities.map((value, index) => [String(index), value]),
        ),
        score: probabilities.reduce((sum, value, index) => sum + value * index, 0),
        type: 'score',
      }
    case 'noul':
      return {
        confidence,
        noul: probabilities[1],
        probabilities: {false: probabilities[0], true: probabilities[1]},
        type: 'noul',
      }
    default: {
      const exhaustive: never = question
      throw new TypeError(`Unsupported question: ${String(exhaustive)}`)
    }
  }
}
