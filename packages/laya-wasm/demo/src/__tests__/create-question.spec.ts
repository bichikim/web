import {expect, it} from 'vitest'
import {createQuestion} from '../create-question'

it('should preserve entered option order while rejecting empty and duplicate labels', () => {
  expect(createQuestion('choice', 'pick', 'b\n\na')).toEqual({
    criteria: ['b', 'a'],
    instructions: 'pick',
    type: 'choice',
  })
  expect(() => createQuestion('choice', 'pick', 'a\na')).toThrow(/서로 다른/)
  expect(() => createQuestion('score', '', 'low\nhigh')).toThrow(/분류 지시문/)
})
it('should produce a boolean question without using stale choice text', () => {
  expect(createQuestion('noul', 'true?', '')).toEqual({instructions: 'true?', type: 'noul'})
})
