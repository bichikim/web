import type {JsonValue, Question, Sequence, SequenceOptions} from './types'

const serializeJson = (item: JsonValue): string => {
  if (item === null) {
    return 'null'
  }
  if (typeof item === 'number' && !Number.isFinite(item)) {
    throw new TypeError('State numbers must be finite.')
  }
  if (Array.isArray(item)) {
    return `[${item.map(serializeJson).join(', ')}]`
  }
  if (typeof item === 'object') {
    return `{${Object.entries(item)
      .map(([key, entry]) => `${JSON.stringify(key)}: ${serializeJson(entry)}`)
      .join(', ')}}`
  }
  return JSON.stringify(item)
}

export const serializeState = (value: JsonValue): string =>
  typeof value === 'string' ? value : serializeJson(value)

export const renderOptions = (question: Question): string[] => {
  switch (question.type) {
    case 'choice': {
      const {criteria} = question
      return Array.isArray(criteria)
        ? [...criteria]
        : Object.entries(criteria).map(([key, description]) =>
            description ? `${key}: ${description}` : key,
          )
    }
    case 'score':
      return question.criteria.map((criterion, index) => `level ${index}: ${criterion}`)
    case 'noul':
      return [
        `false: ${question.criteria?.false || 'no, the statement does not hold'}`,
        `true: ${question.criteria?.true || 'yes, the statement holds'}`,
      ]
    default: {
      const exhaustive: never = question
      throw new TypeError(`Unsupported question: ${String(exhaustive)}`)
    }
  }
}

export const buildSequence = (options: SequenceOptions): Sequence => {
  const {encode, special, config, state, question} = options
  const scrub = (text: string): string => text.split(special.maskToken).join(' ')
  const labels = renderOptions(question)
  if (labels.length < 2 || new Set(labels).size !== labels.length) {
    throw new TypeError('Questions require at least two distinct options.')
  }
  const optionLimit = 48
  const minimumBudget = 16
  const minimumOption = 4
  const minimumHeader = 8
  let tokens = labels.map((label) => [
    special.mask,
    ...encode(` ${scrub(label)}`).slice(0, optionLimit),
  ])
  const total = (): number => tokens.reduce((sum, item) => sum + item.length, 0)
  if (config.headLength - total() < minimumBudget) {
    const limit = Math.max(
      minimumOption,
      Math.floor((config.headLength - minimumBudget) / tokens.length),
    )
    tokens = tokens.map((item) => item.slice(0, limit))
  }
  const header = encode(`${question.type} question: ${scrub(question.instructions)}`).slice(
    0,
    Math.max(minimumHeader, config.headLength - total()),
  )
  const ids = [special.cls, ...header, special.sep]
  const markers = tokens.map((item) => {
    const position = ids.length
    ids.push(...item)
    return position
  })
  ids.push(special.sep)
  if (ids.length + 1 > config.maxLength) {
    throw new RangeError('Question options do not fit the model context.')
  }
  ids.push(
    ...encode(scrub(serializeState(state))).slice(0, config.maxLength - ids.length - 1),
    special.sep,
  )
  return {ids, markers}
}
