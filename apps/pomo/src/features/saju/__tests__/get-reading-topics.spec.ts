import {expect, it} from 'vitest'

import {getReadingTopics} from '../get-reading-topics'

it('should keep a day-pillar fact distinct from work and relationship questions', () => {
  expect(getReadingTopics('제 일주는 무엇인가요?')).toEqual([])
  expect(getReadingTopics('제 일주로 내 일이 맞을지 알려줘')).toContain('career')
  expect(getReadingTopics('제 일주로 결혼운 알려줘')).toContain('relationship')
})

it('should share the same wealth and personality classification across reading flows', () => {
  expect(getReadingTopics('내 일과 돈복은 어때?')).toEqual(['wealth', 'career'])
  expect(getReadingTopics('제 성향과 인간관계는?')).toEqual(['personality', 'other'])
})

it.each(['제 일기에 적을 내 일간은 무엇인가요?', '내 일기장에 적을 일주는 무엇인가요?'])(
  'should leave non-work words out of career topics: %s',
  (question) => {
    expect(getReadingTopics(question)).toEqual([])
  },
)

it.each([
  '내 일과 돈복은 어때?',
  '내 일이 맞을지 알려줘',
  '지금 하는 일',
  '제가 맡은 일은 맞을까요?',
  '제 일을 알려줘',
  '내 일에 대해 알려줘',
  '내 일인지 알려줘',
  '하는 일이라면 무엇을 할까?',
  '내 일에는 어떤 의미가 있나요?',
  '제 일기에 적을 제 일주로 하는 일은 어떤지 알려줘',
])('should retain career topics for work expressions: %s', (question) => {
  expect(getReadingTopics(question)).toContain('career')
})
