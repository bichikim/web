import type {Question} from '../../src/index'

export const createQuestion = (
  type: Question['type'],
  instructions: string,
  choices: string,
): Question => {
  if (instructions.trim().length === 0) {
    throw new TypeError('분류 지시문을 입력하세요.')
  }
  const criteria = choices
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  switch (type) {
    case 'choice':
    case 'score':
      if (criteria.length < 2 || new Set(criteria).size !== criteria.length) {
        throw new TypeError('서로 다른 선택지를 두 개 이상 입력하세요.')
      }
      return {criteria, instructions, type}
    case 'noul':
      return {instructions, type}
    default: {
      const exhaustive: never = type
      throw new TypeError(`Unknown type: ${String(exhaustive)}`)
    }
  }
}
