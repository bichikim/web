import {expect, it} from 'vitest'
import {parseEvaluation} from '../parse-evaluation'

const question = {criteria: ['a', 'b'], instructions: 'Pick', type: 'choice'} as const
const example = {question, state: 'hello', target: [1, 0]}
it('should require a single ground-truth class and preserve the previous data on invalid input', () => {
  expect(parseEvaluation(JSON.stringify(example))).toEqual([example])
  expect(() => parseEvaluation(JSON.stringify({...example, target: [0.5, 0.5]}))).toThrow(
    /정답 하나/,
  )
})
