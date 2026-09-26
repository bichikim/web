import {expect, it, vi} from 'vitest'
import {createJevDecisionProvider} from '../create-jev-decision-provider'
import type {DecisionAnswers, DecisionRequest} from '../types'

const request: DecisionRequest = {
  questions: {violation: {instruction: 'Is this a violation?', type: 'noul'}},
  ruleId: 'test/rule',
  state: {},
}
const answers: DecisionAnswers = {violation: {probability: 0.9, type: 'noul'}}

it('should reject concurrency values that cannot start a request', () => {
  expect(() => createJevDecisionProvider(async () => answers, 0)).toThrow(RangeError)
})

it('should start the next queued request when one of two active requests completes', async () => {
  const firstTwoStarted = Promise.withResolvers<void>()
  const thirdStarted = Promise.withResolvers<void>()
  const responses: Array<ReturnType<typeof Promise.withResolvers<DecisionAnswers>>> = []
  const send = vi.fn(() => {
    const response = Promise.withResolvers<DecisionAnswers>()
    responses.push(response)
    if (responses.length === 2) {
      firstTwoStarted.resolve()
    }
    if (responses.length === 3) {
      thirdStarted.resolve()
    }
    return response.promise
  })
  const provider = createJevDecisionProvider(send, 2)
  const decisions = [provider.decide(request), provider.decide(request), provider.decide(request)]

  await firstTwoStarted.promise
  expect(send).toHaveBeenCalledTimes(2)
  responses[0]!.resolve(answers)
  await thirdStarted.promise
  expect(send).toHaveBeenCalledTimes(3)
  responses[1]!.resolve(answers)
  responses[2]!.resolve(answers)
  await expect(Promise.all(decisions)).resolves.toEqual([answers, answers, answers])
  await provider.close()
})

it('should release a request slot after a failed request', async () => {
  const first = Promise.withResolvers<DecisionAnswers>()
  const send = vi
    .fn()
    .mockImplementationOnce(() => first.promise)
    .mockResolvedValue(answers)
  const provider = createJevDecisionProvider(send, 1)
  const failed = provider.decide(request)
  const next = provider.decide(request)

  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
  first.reject(new Error('request failed'))
  await expect(failed).rejects.toThrow('request failed')
  await expect(next).resolves.toEqual(answers)
  expect(send).toHaveBeenCalledTimes(2)
})
