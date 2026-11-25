import {analyzeDaeun, analyzeElements, analyzeSipseong, deriveSaju} from 'k-saju'
import {expect, it} from 'vitest'
import {createMessages} from '../create-messages'

const birth = {calendar: 'solar', date: '1995-03-16', time: '07:30'} as const

it('should send exact birth facts and everyday reading themes with the original question', () => {
  const chart = deriveSaju(birth)
  const {day, hour, month, year} = chart
  const daeun = analyzeDaeun(birth, chart, 'M')
  const elements = analyzeElements(chart)
  const sipseong = analyzeSipseong(chart)
  const question = '  제 일주를 알려줘.\n내일 면접은 어떻게 준비할까?  '
  const [instructions, user] = createMessages({chart, daeun, elements, question, sipseong})

  expect(instructions.role).toBe('system')
  expect(instructions.content).toContain('각 요청에 답하라')
  expect(instructions.content).toContain('언제 시작했는지와 그 해의 운세를 묻는 것은 다르다')
  expect(user.role).toBe('user')
  expect(user.content).toBe(question)
  const facts = JSON.parse(instructions.content.split('\n사주 계산값: ')[1]!)
  expect(facts).toMatchObject({
    birthDayPillar: '병오(丙午)',
    birthDayStem: '병(丙)',
    chart: {day, hour, month, year},
    daeun,
    elements,
    readingThemes: {primary: expect.any(Array), secondary: expect.any(Array)},
  })
  expect(facts).not.toHaveProperty('sipseong')
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
  expect(user.content).toBe('제 성향과 대운은 어떤가요?')
  expect(JSON.parse(instructions.content.split('\n사주 계산값: ')[1]!)).toMatchObject({
    chart: {hour: null},
    daeun: null,
  })
})

it.each(['일주일이 뭐예요?', '일주간이 무엇인가요?'])(
  'should request the definition of %s without exposing unrelated birth facts',
  (question) => {
    const chart = deriveSaju(birth)
    const [instructions, user] = createMessages({
      chart,
      daeun: null,
      elements: analyzeElements(chart),
      question,
      sipseong: analyzeSipseong(chart),
    })
    expect(instructions.content).toContain('7일')
    expect(instructions.content).not.toContain(chart.day.hanja)
    expect(user).toEqual({content: question, role: 'user'})
  },
)

it.each([
  '올해 시작한 일이 나한테 맞을까?',
  '2024년에 시작한 회사가 나한테 맞을까?',
  '지난 해에 시작한 직장이 나한테 맞을까? 재물은?',
])(
  'should ground %s in traits without mentioning unrelated natal or calendar facts',
  (question) => {
    const chart = deriveSaju(birth)
    const [system, user] = createMessages({
      chart,
      daeun: analyzeDaeun(birth, chart, 'M'),
      elements: analyzeElements(chart),
      question,
      sipseong: analyzeSipseong(chart),
    })

    expect(user.content).toBe(question)
    const facts = JSON.parse(system.content.split('\n사주 계산값: ')[1]!)
    expect(facts).toEqual({'생활 단서': expect.any(Array)})
    expect(system.content).toContain('회사나 다른 사람의 실제 특징으로 간주하지 말고')
  },
)

it.each(['앞날운세는 어때요?', '나의 미래는 ?'])('should ask for a topic on %s', (question) => {
  const chart = deriveSaju(birth)
  const [system, user] = createMessages({
    chart,
    daeun: null,
    elements: analyzeElements(chart),
    question,
    sipseong: analyzeSipseong(chart),
  })
  expect(user.content).toBe(question)
  expect(system.content).toContain('돈, 일, 관계 중 무엇부터')
  expect(system.content).not.toContain(chart.day.hanja)
})
