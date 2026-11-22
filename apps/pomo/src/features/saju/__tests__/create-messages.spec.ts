import {analyzeDaeun, analyzeElements, analyzeSipseong, deriveSaju} from 'k-saju'
import {expect, it} from 'vitest'
import {createMessages} from '../create-messages'

const birth = {calendar: 'solar', date: '1995-03-16', time: '07:30'} as const

it('should send the four pillars and calculated profiles with the question', () => {
  const chart = deriveSaju(birth)
  const {day, hour, month, year} = chart
  const daeun = analyzeDaeun(birth, chart, 'M')
  const elements = analyzeElements(chart)
  const sipseong = analyzeSipseong(chart)
  const question = '  제 일주를 알려줘.\n내일 면접은 어떻게 준비할까?  '
  const [instructions, user] = createMessages({chart, daeun, elements, question, sipseong})

  expect(instructions.role).toBe('system')
  expect(instructions.content).toContain('각 요청에 답하라')
  expect(instructions.content).toContain('사용자가 말한 시점이 무엇을 가리키는지 살펴라')
  expect(user.role).toBe('user')
  expect(JSON.parse(user.content)).toEqual({
    chart: {day, hour, month, year},
    daeun,
    elements,
    question,
    sipseong,
  })
})

it('should preserve unavailable birth-time and long-term calculations as null', () => {
  const chart = deriveSaju({calendar: 'solar', date: '1995-03-16'})
  const [instructions, user] = createMessages({
    chart,
    daeun: null,
    elements: analyzeElements(chart),
    question: '제 성향과 대운은 어떤가요?',
    sipseong: analyzeSipseong(chart),
  })

  expect(instructions.content).toContain('해당 항목을 추정하지 마라')
  expect(JSON.parse(user.content)).toMatchObject({chart: {hour: null}, daeun: null})
})
