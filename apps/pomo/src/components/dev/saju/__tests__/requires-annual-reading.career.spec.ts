import {expect, it} from 'vitest'

import {getReadingTopics} from '../get-reading-topics'
import {requiresAnnualReading} from '../requires-annual-reading'

it('should allow past job context in career questions to reach a natal reading', () => {
  const questions = [
    '지난 해에 시작한 일이 나한테 맞을까?',
    '작년에 시작한 일이 나한테 맞을까?',
    '2024년에 시작한 일이 나한테 맞을까?',
    '지난 해에 시작한 일이 나한테 맞을까? 운동도 즐길까요?',
  ]

  expect(questions.map(getReadingTopics)).toEqual([['career'], ['career'], ['career'], ['career']])
  expect(questions.map(requiresAnnualReading)).toEqual([false, false, false, false])
})

it('should keep blocking annual fortune questions, including when they mention a past job', () => {
  const questions = [
    '2026년 취업운은 어떤가요?',
    '내년 재물운은?',
    '올해는 어떤가요?',
    '작년 직업운은 어땠나요?',
    '2024년에 시작한 일이 올해는 더 잘될까요?',
  ]

  expect(questions.map(requiresAnnualReading)).toEqual([true, true, true, true, true])
})
