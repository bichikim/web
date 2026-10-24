import type {EntryType, JsonValue, Question, Questions} from '@typesafe-ai/sdk'
import type {DecisionQuestions, DecisionRequest, DecisionValue} from './types'

interface JevRequest {
  readonly model: string
  readonly questions: Questions
  readonly state: EntryType
}

const toJsonValue = (value: DecisionValue): JsonValue => {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue)
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toJsonValue(entry)]))
}

const toJevState = (state: DecisionValue): EntryType => {
  if (state === null || typeof state === 'string') {
    return state
  }
  if (typeof state === 'number' || typeof state === 'boolean') {
    return String(state)
  }
  if (Array.isArray(state)) {
    return state.map(toJsonValue)
  }
  return Object.fromEntries(Object.entries(state).map(([key, entry]) => [key, toJsonValue(entry)]))
}

const formatJevQuestions = (questions: DecisionQuestions): Questions =>
  Object.fromEntries(
    Object.entries(questions).map(([identifier, question]): readonly [string, Question] => {
      switch (question.type) {
        case 'choice': {
          const criteria = Array.isArray(question.criteria)
            ? Object.fromEntries(question.criteria.map((label) => [label, null]))
            : question.criteria
          return [identifier, {criteria, instructions: question.instruction, type: 'choice'}]
        }
        case 'noul': {
          return [
            identifier,
            {
              ...(question.criteria === undefined ? {} : {criteria: question.criteria}),
              instructions: question.instruction,
              type: 'noul',
            },
          ]
        }
        default: {
          const unexpected: never = question
          throw new TypeError(`Unsupported decision question: ${JSON.stringify(unexpected)}`)
        }
      }
    }),
  )

export const toJevRequest = (request: DecisionRequest, model: string): JevRequest => ({
  model,
  questions: formatJevQuestions(request.questions),
  state: toJevState(request.state),
})
