import {
  analyzeDaeun,
  analyzeElements,
  analyzeSipseong,
  type BirthInput,
  deriveSaju,
  iljuInfo,
} from 'k-saju'
import {createMessages} from './create-messages'
import {getBroadFutureAnswer} from './get-broad-future-answer'
import {getDayPillarFactAnswer} from './get-day-pillar-fact-answer'
import type {GenerateSajuRequest} from './messages'
import {requiresAnnualReading} from './requires-annual-reading'
import {toSajuCalculationBirth} from './to-saju-calculation-birth'

export interface SajuReadingInput {
  readonly birth: BirthInput
  readonly gender: 'M' | 'F' | 'N'
  readonly question: string
}

export type SajuReadingResult =
  | {readonly text: string; readonly type: 'answer' | 'notice'}
  | {readonly request: GenerateSajuRequest; readonly type: 'generate'}

/** Calculates the chart and chooses the response path for one question. */
export function calculateSajuReading(input: SajuReadingInput): SajuReadingResult {
  const {birth} = input
  const question = input.question.trim()
  if (birth.date === '' || birth.date < '1900-01-01' || birth.date > '2050-12-31') {
    throw new Error('생년월일은 1900년부터 2050년까지 선택해 주세요.')
  }
  if (question === '') {
    throw new Error('해석할 질문을 입력해 주세요.')
  }
  if (requiresAnnualReading(question)) {
    return {
      text: '특정 연도 운세는 계산하지 않아요. 연도를 빼고 다시 질문해 주세요.',
      type: 'notice',
    }
  }

  const calculationBirth = toSajuCalculationBirth(birth)
  const chart = deriveSaju(calculationBirth)
  const answer = getDayPillarFactAnswer(question, chart) ?? getBroadFutureAnswer(question)
  if (answer !== null) {
    return {text: answer, type: 'answer'}
  }

  const elements = analyzeElements(chart)
  const sipseong = analyzeSipseong(chart)
  const ilju = iljuInfo(chart)
  const daeun = input.gender === 'N' ? null : analyzeDaeun(calculationBirth, chart, input.gender)
  return {
    request: {
      messages: createMessages({birth, chart, daeun, elements, ilju, question, sipseong}),
      type: 'generate',
    },
    type: 'generate',
  }
}
