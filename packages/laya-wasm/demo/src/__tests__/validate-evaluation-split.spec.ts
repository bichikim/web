import {expect, it} from 'vitest'
import {validateEvaluationSplit} from '../validate-evaluation-split'

const question = {criteria: ['a', 'b'], instructions: 'Pick', type: 'choice'} as const
const example = {question, state: 'hello', target: [1, 0]}
it('should reject evaluation sentences present in training despite whitespace or label differences', () => {
  expect(() =>
    validateEvaluationSplit([example], [{...example, state: ' HELLO  ', target: [0, 1]}]),
  ).toThrow(/학습 데이터/)
  expect(() => validateEvaluationSplit([example], [{...example, state: 'different'}])).not.toThrow()
})
