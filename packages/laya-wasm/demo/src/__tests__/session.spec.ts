import {expect, it} from 'vitest'
import {initialSession, reduceSession} from '../session'

it('should retain completed steps and mark interrupted training as failed', () => {
  const state = {
    ...initialSession(),
    losses: [2, 1],
    outcome: 'running',
    phase: 'training',
    steps: 3,
    total: 10,
  } as const
  const result = reduceSession(state, {loaded: true, message: 'runtime error', type: 'failed'})
  expect(result.phase).toBe('ready')
  expect(result.outcome).toBe('failed')
  expect(result.steps).toBe(3)
  expect(result.losses).toEqual([2, 1])
})
it('should remove stale predictions and metrics when applying a checkpoint', () => {
  const state = {...initialSession(), losses: [2, 1], phase: 'restoring', total: 2} as const
  const result = reduceSession(state, {steps: 12, type: 'restored'})
  expect(result.steps).toBe(12)
  expect(result.comparison).toBeNull()
  expect(result.losses).toEqual([])
  expect(result.total).toBe(0)
  expect(result.evaluation).toBeNull()
  expect(result.evaluationProgress).toBeNull()
})
it('should retain evaluation progress without changing training step counts and clear it on failure', () => {
  const state = {...initialSession(), phase: 'training', steps: 90} as const
  const progress = {completed: 12, stage: 'after', total: 30} as const
  const evaluated = reduceSession(state, {progress, type: 'evaluation-progress'})
  expect(evaluated.steps).toBe(90)
  expect(evaluated.evaluationProgress).toEqual(progress)
  const failed = reduceSession(evaluated, {
    loaded: true,
    message: 'evaluation failed',
    type: 'failed',
  })
  expect(failed.evaluationProgress).toBeNull()
  expect(failed.evaluation).toBeNull()
  expect(failed.steps).toBe(90)
})
