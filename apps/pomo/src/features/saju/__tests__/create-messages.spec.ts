import {analyzeDaeun, analyzeElements, analyzeSipseong, type BirthInput, deriveSaju} from 'k-saju'
import {expect, it} from 'vitest'
import {createMessages} from '../create-messages'

const BIRTH = {calendar: 'solar', date: '1995-03-16', time: '07:30'} as const
const SPECIALIST_TERMS = /비겁|식상|재성|관성|인성|십성|십이운성|가중치|[\u3400-\u9fff]/u

function createInput(birth: BirthInput) {
  const chart = deriveSaju(birth)
  return {
    chart,
    daeun: analyzeDaeun(birth, chart, 'M'),
    elements: analyzeElements(chart),
    question: '재물에 대해 알려줘',
    sipseong: analyzeSipseong(chart),
  }
}

it('should supply readable subjects instead of raw terminology, scores and stage names', () => {
  const input = createInput(BIRTH)
  const messages = createMessages(input)
  const [serialized, request] = messages[1].content.split('\n\n')
  const context = JSON.parse(serialized)

  expect(context).not.toHaveProperty('birth')
  expect(context.question).toBe(input.question)
  expect(context).not.toHaveProperty('chart')
  expect(context.themes).toContainEqual({
    observed: false,
    prominent: false,
    subject: '돈과 시간 관리',
  })
  expect(context.themes).toContainEqual({
    observed: true,
    prominent: true,
    subject: '배움과 도움',
  })
  expect(serialized).not.toMatch(/presence|중간|많이 나타남|적게 나타남/u)
  expect(context).not.toHaveProperty('daeun')
  expect(serialized.match(/배움과 도움/gu)).toHaveLength(1)
  expect(serialized).not.toMatch(SPECIALIST_TERMS)
  expect(serialized).not.toMatch(/\d+\.\d+/u)
  expect(context).not.toHaveProperty('glossary')
  expect(context).not.toHaveProperty('ilju')
  expect(messages).toHaveLength(2)
  expect(request).toContain(input.question)
})

it('should derive readable subjects from the actual day rather than a fixed element meaning', () => {
  const messages = createMessages(createInput({...BIRTH, date: '1995-03-19'}))
  const context = JSON.parse(messages[1].content.split('\n\n')[0])

  expect(context.themes).toContainEqual({
    observed: true,
    prominent: true,
    subject: '협력과 조율',
  })
})

it('should keep tied weights without assigning a standout theme or a grade', () => {
  const input = createInput(BIRTH)
  const messages = createMessages({
    ...input,
    elements: {...input.elements, weighted: {土: 1, 木: 1, 水: 1, 火: 1, 金: 1}},
  })
  const context = JSON.parse(messages[1].content.split('\n\n')[0])

  expect(context.themes.every((theme: {prominent: boolean}) => !theme.prominent)).toBe(true)
  expect(context.themes).toEqual(
    expect.arrayContaining([
      {
        observed: false,
        prominent: false,
        subject: '돈과 시간 관리',
      },
      {
        observed: true,
        prominent: false,
        subject: '배움과 도움',
      },
    ]),
  )
  expect(messages[1].content.split('\n\n')[0]).not.toContain('presence')
})

it('should retain all jointly strongest themes as consultation evidence', () => {
  const input = createInput(BIRTH)
  const messages = createMessages({
    ...input,
    elements: {...input.elements, weighted: {土: 1, 木: 2, 水: 1, 火: 2, 金: 1}},
  })
  const context = JSON.parse(messages[1].content.split('\n\n')[0])

  expect(
    context.themes
      .filter((theme: {prominent: boolean}) => theme.prominent)
      .map((theme: {subject: string}) => theme.subject),
  ).toEqual(['배움과 도움', '협력과 조율'])
})

it('should preserve missing birth-time and long-term facts without inferring them', () => {
  const input = createInput({calendar: 'solar', date: '1995-03-16'})
  const messages = createMessages({...input, daeun: null, question: '제 성향과 대운은 어떤가요?'})
  const context = JSON.parse(messages[1].content.split('\n\n')[0])

  expect(messages[0].content).toContain('출생 시각은 알 수 없다')
  expect(context.daeun).toBeNull()
  expect(context.themes).toHaveLength(5)
})

it('should retain long-term subjects and their sequence when that topic is requested', () => {
  const input = createInput(BIRTH)
  const messages = createMessages({...input, question: '대운은 어떻게 해석하나요?'})
  const context = JSON.parse(messages[1].content.split('\n\n')[0])

  expect(context.daeun.periods[0].subjects).toEqual(['표현과 창작', '배움과 도움'])
  expect(context.daeun.periods.length).toBe(input.daeun?.pillars.length)
})

it('should include only the requested day name when a user asks for that technical fact', () => {
  const input = createInput(BIRTH)
  const messages = createMessages({...input, question: '제 일주는 무엇인가요?'})
  const context = JSON.parse(messages[1].content)

  expect(context.chart).toEqual({day: input.chart.day})
  expect(context).not.toHaveProperty('themes')
  expect(context).not.toHaveProperty('daeun')
  expect(context).not.toHaveProperty('ilju')
  expect(context).not.toHaveProperty('glossary')
})

it.each([
  '제 일간으로 수입을 볼 수 있어?',
  '제 일주로 지금 하는 일이 맞을지 알려줘',
  '제 일주로 결혼운 알려줘',
])(
  'should preserve the consultation subjects when a question also mentions the day: %s',
  (question) => {
    const messages = createMessages({...createInput(BIRTH), question})
    const context = JSON.parse(messages[1].content.split('\n\n')[0])

    expect(context.question).toBe(question)
    expect(context.themes).toHaveLength(5)
    expect(context.themes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({subject: '돈과 시간 관리'}),
        expect.objectContaining({subject: '약속과 책임'}),
        expect.objectContaining({
          subject: '협력과 조율',
        }),
      ]),
    )
  },
)
