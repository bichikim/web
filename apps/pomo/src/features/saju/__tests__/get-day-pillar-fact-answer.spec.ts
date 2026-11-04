import {deriveSaju} from 'k-saju'
import {expect, it} from 'vitest'

import {getDayPillarFactAnswer} from '../get-day-pillar-fact-answer'

const CHART = deriveSaju({calendar: 'solar', date: '1995-03-16', time: '07:30'})

it('should answer direct day-pillar questions with the calculated pillars', () => {
  expect(getDayPillarFactAnswer('제 일주는 무엇인가요?', CHART)).toContain('병오(丙午)')
  expect(getDayPillarFactAnswer('제 일간을 알려줘', CHART)).toContain('병(丙)')
  expect(getDayPillarFactAnswer('제 일주는 무엇인가요?', CHART)).not.toMatch(/천간|지지|십성|일간/u)
  expect(getDayPillarFactAnswer('제 일간을 알려줘', CHART)).not.toMatch(/천간|지지|십성/u)
})

it('should answer a day-stem fact requested for a diary', () => {
  expect(getDayPillarFactAnswer('제 일기에 적을 내 일간은 무엇인가요?', CHART)).toContain('병(丙)')
})

it('should answer both names when both are requested without adding specialist explanations', () => {
  const answer = getDayPillarFactAnswer('제 일주와 일간을 알려줘', CHART)
  expect(answer).toContain('일주는 병오(丙午)')
  expect(answer).toContain('일간은 병(丙)')
  expect(answer).not.toMatch(/천간|지지|십성/u)
})

it.each([
  '일주간이 무엇인가요?',
  '일주일이 뭐예요?',
  '일주변이 무엇인가요?',
  '일주일간이 무엇인가요?',
])('should leave duration and place words out of day-pillar facts: %s', (question) => {
  expect(getDayPillarFactAnswer(question, CHART)).toBeNull()
})

it('should answer only the real day name when a duration is also mentioned', () => {
  const answer = getDayPillarFactAnswer('일주일 뒤 제 일간은 무엇인가요?', CHART)
  expect(answer).toContain('일간은 병(丙)')
  expect(answer).not.toContain('일주는')
})

it('should not treat the end of a duration as a requested day stem', () => {
  const answer = getDayPillarFactAnswer('일주일간이 아니라 제 일주는 무엇인가요?', CHART)
  expect(answer).toContain('일주는 병오(丙午)')
  expect(answer).not.toContain('일간은')
})

it.each([
  '제 일주인지 알려줘',
  '일주란 무엇인가요?',
  '제 일주라고 하는 것은 뭐예요?',
  '제 일주부터 알려줘',
  '제일주가 무엇인가요?',
])('should retain day-pillar facts with existing endings and spacing: %s', (question) => {
  expect(getDayPillarFactAnswer(question, CHART)).toContain('일주는 병오(丙午)')
})

it('should leave interpretive questions to the reading flow', () => {
  expect(getDayPillarFactAnswer('제 일주 성향을 해석해줘', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 재물운은 어떤가요?', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 일간으로 돈복 알려줘', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 일주로 지금 하는 일이 맞을지 알려줘', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 일주로 내 일이 맞을지 알려줘', CHART)).toBeNull()
  expect(getDayPillarFactAnswer('제 일주로 결혼운 알려줘', CHART)).toBeNull()
})
