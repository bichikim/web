import {readObject} from '../../src/manifest'
import {renderOptions} from '../../src/sequence'
import type {JsonValue, Question, TrainingExample} from '../../src/types'

const parseState = (value: unknown): JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('state에는 유한한 숫자만 사용할 수 있습니다.')
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map(parseState)
  }
  return Object.fromEntries(
    Object.entries(readObject(value)).map(([key, item]) => [key, parseState(item)]),
  )
}
const parseLabels = (value: unknown): string[] => {
  if (
    !Array.isArray(value) ||
    !value.every(
      (item: unknown): item is string => typeof item === 'string' && item.trim().length > 0,
    ) ||
    value.length < 2 ||
    new Set(value).size !== value.length
  ) {
    throw new TypeError('선택지는 서로 다른 문자열 두 개 이상이어야 합니다.')
  }
  return value
}
const parseChoices = (
  value: unknown,
): readonly string[] | Readonly<Record<string, string | null>> => {
  if (Array.isArray(value)) {
    return parseLabels(value)
  }
  const entries = Object.entries(readObject(value))
  if (entries.length < 2) {
    throw new TypeError('선택지는 두 개 이상이어야 합니다.')
  }
  return Object.fromEntries(
    entries.map(([key, description]) => {
      if (key.trim().length === 0 || (description !== null && typeof description !== 'string')) {
        throw new TypeError('선택지 이름은 문자열, 설명은 문자열 또는 null이어야 합니다.')
      }
      return [key, description]
    }),
  )
}
const parseNoulCriteria = (value: unknown): {readonly false?: string; readonly true?: string} => {
  const criteria = readObject(value)
  const optional = (key: string): string | undefined => {
    const description = criteria[key]
    if (description !== undefined && typeof description !== 'string') {
      throw new TypeError('참·거짓 설명은 문자열이어야 합니다.')
    }
    return description
  }
  const negative = optional('false')
  const positive = optional('true')
  return {
    ...(negative === undefined ? {} : {false: negative}),
    ...(positive === undefined ? {} : {true: positive}),
  }
}
const parseQuestion = (value: unknown): Question => {
  const question = readObject(value)
  const {instructions} = question
  if (typeof instructions !== 'string' || instructions.trim().length === 0) {
    throw new TypeError('question.instructions에 분류 지시문을 입력하세요.')
  }
  switch (question.type) {
    case 'choice':
      return {criteria: parseChoices(question.criteria), instructions, type: 'choice'}
    case 'score':
      return {criteria: parseLabels(question.criteria), instructions, type: 'score'}
    case 'noul':
      return question.criteria === undefined
        ? {instructions, type: 'noul'}
        : {criteria: parseNoulCriteria(question.criteria), instructions, type: 'noul'}
    default:
      throw new TypeError('질문 유형은 choice, score, noul 중 하나여야 합니다.')
  }
}
const parseExample = (value: unknown): TrainingExample => {
  const record = readObject(value)
  if (!Object.hasOwn(record, 'state')) {
    throw new TypeError('state 필드가 필요합니다.')
  }
  const state = parseState(record.state)
  const question = parseQuestion(record.question)
  const options = renderOptions(question)
  if (new Set(options).size !== options.length) {
    throw new TypeError('선택지 표현이 중복됩니다.')
  }
  const {target} = record
  const tolerance = 1e-5
  if (
    !Array.isArray(target) ||
    !target.every(
      (item: unknown): item is number =>
        typeof item === 'number' && Number.isFinite(item) && item >= 0,
    ) ||
    target.length !== options.length ||
    Math.abs(target.reduce((sum, item) => sum + item, 0) - 1) > tolerance
  ) {
    throw new TypeError(
      'target은 선택지 수와 길이가 같고 합이 1인 음수 없는 확률 배열이어야 합니다.',
    )
  }
  return {question, state, target}
}

/** Parses a complete JSONL dataset; any invalid record rejects the entire file. */
export const parseTrainingJsonl = (text: string): readonly TrainingExample[] => {
  const examples = text
    .replace(/^\uFEFF/u, '')
    .split(/\r?\n/u)
    .flatMap((line, index) => {
      if (line.trim().length === 0) {
        return []
      }
      try {
        return [parseExample(JSON.parse(line))]
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause)
        throw new TypeError(`${index + 1}번째 줄: ${detail}`, {cause})
      }
    })
  if (examples.length === 0) {
    throw new TypeError('학습 예제가 없습니다.')
  }
  return examples
}
