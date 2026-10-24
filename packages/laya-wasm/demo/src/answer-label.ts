import type {Question} from '../../src/types'

export const answerLabel = (key: string, question?: Question): string =>
  question?.type === 'score' ? (question.criteria[Number(key)] ?? key) : key
