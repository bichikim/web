import type {Saju} from 'k-saju'
import {getReadingTopics} from './get-reading-topics'

const DAY_PILLAR_PATTERN = /일주|일간/u
const FACT_QUESTION_PATTERN = /무엇|뭐|어떤\s*글자|알려/u
const INTERPRETATION_PATTERN = /풀이|해석|운세/u

/** Answers direct day-pillar fact questions from the calculated chart. */
export function getDayPillarFactAnswer(question: string, chart: Saju): string | null {
  if (
    !DAY_PILLAR_PATTERN.test(question) ||
    !FACT_QUESTION_PATTERN.test(question) ||
    INTERPRETATION_PATTERN.test(question) ||
    getReadingTopics(question).length > 0
  ) {
    return null
  }

  const stem = `${chart.day.korean.at(0)}(${chart.day.stem})`
  if (question.includes('일주')) {
    return `입력한 생년월일의 일주는 ${chart.day.korean}(${chart.day.hanja})입니다. 일주는 태어난 날의 천간과 지지를 합친 두 글자입니다. 일간은 ${stem}입니다.`
  }

  return `입력한 생년월일의 일간은 ${stem}입니다. 일간은 일주의 천간으로, 십성 관계를 계산할 때 기준이 됩니다.`
}
