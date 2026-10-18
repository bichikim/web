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
