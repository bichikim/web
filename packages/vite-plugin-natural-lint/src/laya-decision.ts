import {z} from 'zod'
import type {DecisionAnswers, DecisionQuestions} from './types'

export const LAYA_DECISION_VERSION = 1

interface LayaNoulQuestion {
  readonly criteria?: {
    readonly false?: string
    readonly true?: string
  }
  readonly instructions: string
  readonly type: 'noul'
}

interface LayaChoiceQuestion {
  readonly criteria: Record<string, string | null> | string[]
  readonly instructions: string
  readonly type: 'choice'
}

export type LayaDecisionQuestions = Record<string, LayaChoiceQuestion | LayaNoulQuestion>

const probabilitySchema = z.number().finite().min(0).max(1)
const answerSchema = z.discriminatedUnion('type', [
  z.object({
    noul: probabilitySchema,
    type: z.literal('noul'),
  }),
  z.object({
    choice: z.string(),
    confidence: probabilitySchema,
    probabilities: z.record(z.string(), probabilitySchema),
    type: z.literal('choice'),
  }),
])
const answersSchema = z.record(z.string(), answerSchema)

export const formatDecisionQuestions = (questions: DecisionQuestions): LayaDecisionQuestions =>
  Object.fromEntries(
    Object.entries(questions).map(([identifier, question]) => {
      switch (question.type) {
        case 'choice': {
          return [
            identifier,
            {
              criteria: Array.isArray(question.criteria)
                ? [...question.criteria]
                : {...question.criteria},
              instructions: question.instruction,
              type: question.type,
            },
          ]
        }
        case 'noul': {
          return [
            identifier,
            {
              ...(question.criteria === undefined ? {} : {criteria: question.criteria}),
              instructions: question.instruction,
              type: question.type,
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

export const normalizeDecisionAnswers = (
  questions: DecisionQuestions,
  value: unknown,
): DecisionAnswers => {
  const parsed = answersSchema.parse(value)
  return Object.fromEntries(
    Object.entries(questions).map(([identifier, question]) => {
      const answer = parsed[identifier]
      if (answer === undefined) {
        throw new TypeError(`Laya result did not include an answer for ${identifier}.`)
      }
      if (answer.type !== question.type) {
        throw new TypeError(`Laya answer type did not match question ${identifier}.`)
      }
      switch (answer.type) {
        case 'choice': {
          return [
            identifier,
            {
              choice: answer.choice,
              confidence: answer.confidence,
              probabilities: answer.probabilities,
              type: answer.type,
            },
          ]
        }
        case 'noul': {
          return [identifier, {probability: answer.noul, type: answer.type}]
        }
        default: {
          const unexpected: never = answer
          throw new TypeError(`Unsupported Laya answer: ${JSON.stringify(unexpected)}`)
        }
      }
    }),
  )
}
