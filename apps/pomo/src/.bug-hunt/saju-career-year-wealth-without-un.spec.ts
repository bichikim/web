import {expect, it} from 'vitest'

import {requiresAnnualReading} from 'src/components/dev/saju/requires-annual-reading'

it('should keep blocking year-context career questions that also ask other fortune topics without the 운 suffix', () => {
  const questions = [
    '지난 해에 시작한 직장이 나한테 맞을까? 재물은?',
    '지난 해에 시작한 직장이 나한테 맞을까? 돈은?',
    '지난 해에 시작한 직장이 나한테 맞을까? 연애는?',
    '지난 해에 시작한 직장이 나한테 맞을까? 결혼은?',
    '지난 해에 시작한 직장이 나한테 맞을까? 건강은?',
  ]

  expect(questions.map(requiresAnnualReading)).toEqual([true, true, true, true, true])
})
