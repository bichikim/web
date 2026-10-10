import {analyzeDaeun, analyzeElements, analyzeSipseong, deriveSaju, iljuInfo} from 'k-saju'
import {expect, it} from 'vitest'

import {createMessages} from '../create-messages'

it('should explain ten-god categories relative to the actual day master', () => {
  const birth = {calendar: 'solar', date: '1995-03-16', time: '07:30'} as const
  const chart = deriveSaju(birth)
  const messages = createMessages({
    birth,
    chart,
    daeun: analyzeDaeun(birth, chart, 'M'),
    elements: analyzeElements(chart),
    ilju: iljuInfo(chart),
    question: '재물에 대해 알려줘',
    sipseong: analyzeSipseong(chart),
  })
  const context = JSON.parse(messages[1].content) as {
    question: string
    elements: Record<string, unknown>
    sipseong: Record<string, unknown>
    tenGodsByElement: Record<string, string>
    glossary: Record<string, string>
    tenGodFacts: Array<{category: string; count: number; element: string}>
  }

  expect(context.question).toBe('재물에 대해 알려줘')
  expect(context.elements).toHaveProperty('counts')
  expect(context.elements).toHaveProperty('weighted')
  expect(context.elements).not.toHaveProperty('lacking')
  expect(context.elements).not.toHaveProperty('excess')
  expect(context.sipseong).not.toHaveProperty('dominant')
  expect(context.tenGodsByElement['金']).toBe('재성')
  expect(context.tenGodsByElement['水']).toBe('관성')
  expect(context.glossary['재성']).toContain('재물')
  expect(Object.values(context.glossary).join(' ')).not.toMatch(/일간|오행|천간|지지|생하|제어/u)
  expect(messages[0].content).toContain('단정')
  expect(context.tenGodFacts).toContainEqual({category: '재성', count: 0, element: '金'})
  expect(messages[0].content).toContain('질문하지 않은 주제로 풀이를 확장하지 마라')
  expect(messages[0].content).toContain('분류명이나 계산 관계를 설명하지 마라')
  expect(messages[0].content).toContain('사용자가 묻지 않은 용어 풀이를 덧붙이지 마라')
  expect(messages[0].content).toContain('Markdown')
  expect(messages[0].content).toContain('짧은 문단 2~3개')
  expect(messages[0].content).toContain('ilju.twelveStage를 두 값의 근거로 삼지 마라')
  expect(messages[0].content).toContain('counts의 가장 큰 값도')
  expect(messages[0].content).toContain('재성이 0개인 명식에서 재물 질문')
  expect(messages[0].content).toContain('다른 분류로 돈을 버는 방식이나 성향을 추측하지 마라')
})

it('should explain omitted hour and daeun values instead of asking the model to infer them', () => {
  const birth = {calendar: 'solar', date: '1995-03-16'} as const
  const chart = deriveSaju(birth)
  const messages = createMessages({
    birth,
    chart,
    daeun: null,
    elements: analyzeElements(chart),
    ilju: iljuInfo(chart),
    question: '제 성향은 어떤가요?',
    sipseong: analyzeSipseong(chart),
  })

  expect(messages[0].content).toContain('시주에 근거한 풀이는 하지 마라')
  expect(messages[0].content).toContain('대운의 방향이나 시기를 추정하지 마라')
  expect(messages[0].content).toContain('실제 성격을 단정할 수 없음을 먼저 말하라')
  expect(messages[0].content).not.toContain('재성이 0개인 명식에서 재물 질문')
})

it('should send only day-pillar facts for a day-pillar question', () => {
  const birth = {calendar: 'solar', date: '1995-03-16', time: '07:30'} as const
  const chart = deriveSaju(birth)
  const messages = createMessages({
    birth,
    chart,
    daeun: analyzeDaeun(birth, chart, 'M'),
    elements: analyzeElements(chart),
    ilju: iljuInfo(chart),
    question: '제 일주는 무엇인가요?',
    sipseong: analyzeSipseong(chart),
  })
  const context = JSON.parse(messages[1].content) as Record<string, unknown>

  expect(context.chart).toEqual({day: chart.day})
  expect(context.ilju).toEqual(iljuInfo(chart))
  expect(context).not.toHaveProperty('sipseong')
  expect(context).not.toHaveProperty('elements')
  expect(context).not.toHaveProperty('daeun')
  expect(messages[0].content).toContain('일주와 일간만 설명하라')
  expect(messages[0].content).toContain('분류명이나 계산 관계를 설명하지 마라')
})

it('should retain income facts when a question also mentions the day master', () => {
  const birth = {calendar: 'solar', date: '1995-03-16', time: '07:30'} as const
  const chart = deriveSaju(birth)
  const messages = createMessages({
    birth,
    chart,
    daeun: analyzeDaeun(birth, chart, 'M'),
    elements: analyzeElements(chart),
    ilju: iljuInfo(chart),
    question: '제 일간으로 수입을 볼 수 있어?',
    sipseong: analyzeSipseong(chart),
  })

  expect(JSON.parse(messages[1].content)).toHaveProperty('sipseong.counts.재성', 0)
})

it('should retain career facts when a question mentions the day pillar and current work', () => {
  const birth = {calendar: 'solar', date: '1995-03-16', time: '07:30'} as const
  const chart = deriveSaju(birth)
  const messages = createMessages({
    birth,
    chart,
    daeun: analyzeDaeun(birth, chart, 'M'),
    elements: analyzeElements(chart),
    ilju: iljuInfo(chart),
    question: '제 일주로 지금 하는 일이 맞을지 알려줘',
    sipseong: analyzeSipseong(chart),
  })

  expect(JSON.parse(messages[1].content)).toHaveProperty('sipseong.counts.관성', 2)
})

it('should retain all reading facts for a marriage question that mentions the day pillar', () => {
  const birth = {calendar: 'solar', date: '1995-03-16', time: '07:30'} as const
  const chart = deriveSaju(birth)
  const messages = createMessages({
    birth,
    chart,
    daeun: analyzeDaeun(birth, chart, 'M'),
    elements: analyzeElements(chart),
    ilju: iljuInfo(chart),
    question: '제 일주로 결혼운 알려줘',
    sipseong: analyzeSipseong(chart),
  })

  expect(JSON.parse(messages[1].content)).toHaveProperty('sipseong.counts.비겁', 1)
})
