import {deriveSaju} from 'k-saju'
import {expect, it} from 'vitest'

import {getDayPillarFactAnswer} from '../get-day-pillar-fact-answer'

const CHART = deriveSaju({calendar: 'solar', date: '1995-03-16', time: '07:30'})

it('should answer direct day-pillar questions with the calculated pillars', () => {
  expect(getDayPillarFactAnswer('제 일주는 무엇인가요?', CHART)).toContain('병오(丙午)')
  expect(getDayPillarFactAnswer('제 일간을 알려줘', CHART)).toContain('병(丙)')
})

it('should leave interpretive questions to the reading flow', () => {
  expect(getDayPillarFactAnswer('제 일주 성향을 해석해줘', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 재물운은 어떤가요?', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 일간으로 돈복 알려줘', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 일주로 지금 하는 일이 맞을지 알려줘', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 일주로 내 일이 맞을지 알려줘', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 일주로 결혼운 알려줘', CHART)).toBeNull()
})
