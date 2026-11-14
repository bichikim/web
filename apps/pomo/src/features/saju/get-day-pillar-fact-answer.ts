import type {Saju} from 'k-saju'
import {getDayPillarTerms} from './get-day-pillar-terms'
import {getReadingTopics} from './get-reading-topics'

const FACT_QUESTION_PATTERN = /무엇|뭐|어떤\s*글자|알려/u
const INTERPRETATION_PATTERN = /풀이|해석|운세/u

/** Answers direct day-pillar fact questions from the calculated chart. */
export function getDayPillarFactAnswer(question: string, chart: Saju): string | null {
  const terms = getDayPillarTerms(question)
  if (
    terms.length === 0 ||
    !FACT_QUESTION_PATTERN.test(question) ||
    INTERPRETATION_PATTERN.test(question) ||
    getReadingTopics(question).length > 0
  ) {
    return null
  }

  const stem = `${chart.day.korean.at(0)}(${chart.day.stem})`
  return [
    ...(terms.includes('일주')
      ? [
          `일주는 ${chart.day.korean}(${chart.day.hanja})입니다. 태어난 날을 나타내는 두 글자를 말합니다.`,
        ]
      : []),
    ...(terms.includes('일간')
      ? [
          `일간은 ${stem}입니다. 태어난 날을 나타내는 두 글자 중 첫 글자로, 사주를 읽을 때 기준으로 삼습니다.`,
        ]
      : []),
  ].join(' ')
}
