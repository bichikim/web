import {expect, it} from 'vitest'
import type {ReviewCandidate} from '../../review'
import {createReviewSession, type ReviewTuiCandidate, updateReviewSession} from '../review-session'

const createCandidate = (
  observedStatus: ReviewCandidate['observedStatus'],
): ReviewTuiCandidate => ({
  candidate: {
    answers: {},
    modelProbability: 0.8,
    observedStatus,
    providerIdentifier: 'test',
    providerRevision: '1',
    questions: {},
    relativePath: 'src/example.ts',
    ruleFingerprint: 'fingerprint',
    ruleId: 'example',
    state: {},
  },
  source: 'export {}',
})

it('should advance without recording when the reviewer defers', () => {
  const next = updateReviewSession(createReviewSession(), [createCandidate('pass')], {type: 'next'})

  expect(next.currentIndex).toBe(1)
  expect(next.labels.size).toBe(0)
})

it('should return to the previous candidate and replace its label', () => {
  const candidates = [createCandidate('fail')]
  const labeled = updateReviewSession(createReviewSession(), candidates, {
    label: 'fail',
    type: 'label',
  })
  const previous = updateReviewSession(labeled, candidates, {type: 'previous'})
  const replaced = updateReviewSession(previous, candidates, {label: 'pass', type: 'label'})

  expect(previous.currentIndex).toBe(0)
  expect(previous.labels.get('example:src/example.ts')?.label).toBe('fail')
  expect(replaced.labels.get('example:src/example.ts')).toEqual({
    label: 'pass',
    labelSource: 'human',
  })
})

it('should clear the current selection when the reviewer defers after returning', () => {
  const candidates = [createCandidate('fail')]
  const labeled = updateReviewSession(createReviewSession(), candidates, {
    label: 'fail',
    type: 'label',
  })
  const previous = updateReviewSession(labeled, candidates, {type: 'previous'})
  const deferred = updateReviewSession(previous, candidates, {type: 'next'})

  expect(deferred.currentIndex).toBe(1)
  expect(deferred.labels.size).toBe(0)
})

it('should distinguish a human label from an accepted model label', () => {
  const candidate = createCandidate('fail')
  const human = updateReviewSession(createReviewSession(), [candidate], {
    label: 'pass',
    type: 'label',
  })
  const accepted = updateReviewSession(createReviewSession(), [candidate], {type: 'accept-model'})

  expect(human.labels.get('example:src/example.ts')).toEqual({
    label: 'pass',
    labelSource: 'human',
  })
  expect(accepted.labels.get('example:src/example.ts')).toEqual({
    label: 'fail',
    labelSource: 'accepted-model',
  })
})

it('should preserve an accepted uncertain model verdict without treating it as a human label', () => {
  const accepted = updateReviewSession(createReviewSession(), [createCandidate('uncertain')], {
    type: 'accept-model',
  })

  expect(accepted.labels.get('example:src/example.ts')).toEqual({
    label: 'uncertain',
    labelSource: 'accepted-model',
  })
})
