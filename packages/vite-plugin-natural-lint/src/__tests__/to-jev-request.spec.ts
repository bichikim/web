import {expect, it} from 'vitest'
import {toJevRequest} from '../to-jev-request'

it('should convert questions and state into the Jev request contract', () => {
  expect(
    toJevRequest(
      {
        questions: {
          scope: {criteria: ['broad', 'specific'], instruction: 'What scope?', type: 'choice'},
          violation: {instruction: 'Is this a violation?', type: 'noul'},
        },
        ruleId: 'test/rule',
        state: {nested: [true, 2, null]},
      },
      'jev-latest',
    ),
  ).toEqual({
    model: 'jev-latest',
    questions: {
      scope: {
        criteria: {broad: null, specific: null},
        instructions: 'What scope?',
        type: 'choice',
      },
      violation: {instructions: 'Is this a violation?', type: 'noul'},
    },
    state: {nested: [true, 2, null]},
  })
})

it('should stringify primitive top-level state values required by Jev', () => {
  expect(toJevRequest({questions: {}, ruleId: 'test/rule', state: false}, 'jev-latest').state).toBe(
    'false',
  )
})
