import {analyzeDaeun, analyzeElements, analyzeSipseong, type BirthInput, deriveSaju} from 'k-saju'
import {createMessages} from './create-messages'
import type {GenerateSajuRequest} from './messages'
import {toSajuCalculationBirth} from './to-saju-calculation-birth'

export interface SajuReadingInput {
  readonly birth: BirthInput
  readonly gender: 'M' | 'F' | 'N'
  readonly question: string
}

export function calculateSajuReading(input: SajuReadingInput) {
  const {birth, gender, question} = input
  if (birth.date === '') {
    throw new Error('생년월일을 선택해 주세요.')
  }
  if (birth.date < '1900-01-01' || birth.date > '2050-12-31') {
    throw new Error('생년월일은 1900년부터 2050년까지 선택해 주세요.')
  }
  if (question.trim() === '') {
    throw new Error('해석할 질문을 입력해 주세요.')
  }

  const calculationBirth = toSajuCalculationBirth(birth)
  const chart = deriveSaju(calculationBirth)
  const calculation = {
    chart,
    daeun: gender === 'N' ? null : analyzeDaeun(calculationBirth, chart, gender),
    elements: analyzeElements(chart),
    sipseong: analyzeSipseong(chart),
  }
  const request: GenerateSajuRequest = {
    messages: createMessages({...calculation, question}),
    type: 'generate',
  }
  return {calculation, request}
}
