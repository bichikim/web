import {expect, it} from 'vitest'

import {getReadingTopics} from '../get-reading-topics'
import {requiresAnnualReading} from '../requires-annual-reading'

it('should allow past job context in career questions to reach a natal reading', () => {
  const questions = [
    '지난 해에 시작한 일이 나한테 맞을까?',
    '작년에 시작한 일이 나한테 맞을까?',
    '2024년에 시작한 일이 나한테 맞을까?',
    '지난 해에 시작한 일이 나한테 맞을까? 운동도 즐길까요?',
    '지난 해에 시작한 일이 나한테 맞을까? 어려운 일이라 고민돼요.',
  ]

  expect(questions.map(getReadingTopics)).toEqual([
    ['career'],
    ['career'],
    ['career'],
    ['career'],
    ['career'],
  ])
  expect(questions.map(requiresAnnualReading)).toEqual([false, false, false, false, false])
})

it('should keep blocking annual fortune questions, including when they mention a past job', () => {
  const questions = [
    '2026년 취업운은 어떤가요?',
    '내년 재물운은?',
    '올해는 어떤가요?',
    '작년 직업운은 어땠나요?',
    '2024년에 시작한 일이 올해는 더 잘될까요?',
    '2026년 세운을 알려줘',
    '지난 해에 시작한 일이 나한테 맞을까? 운세를 알려줘',
    '지난 해에 시작한 일이 나한테 맞을까? 운세에 대해 알려줘',
    '작년에 시작한 직장 운은 어땠나요?',
    '작년에 시작한 직장 이직운은 어떤가요?',
    '지난 해에 시작한 직장이 나한테 맞을까? 금전운은?',
    '지난 해에 시작한 직장이 나한테 맞을까? 연애운은?',
    '지난 해에 시작한 직장이 나한테 맞을까? 결혼운은?',
    '지난 해에 시작한 직장이 나한테 맞을까? 건강운은?',
    '지난 해에 시작한 직장이 나한테 맞을까? 직장운은?',
  ]

  expect(questions.map(requiresAnnualReading)).toEqual([
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ])
})
