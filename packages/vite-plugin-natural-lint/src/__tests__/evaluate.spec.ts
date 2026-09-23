import {expect, it} from 'vitest'
import {evaluateReviews, formatEvaluationReport} from '../evaluate'
import type {ReviewRecord} from '../review'

const createRecord = (
  relativePath: string,
  label: ReviewRecord['label'],
  observedStatus: ReviewRecord['observedStatus'],
  labelSource: ReviewRecord['labelSource'] = 'human',
): ReviewRecord => ({
  answers: {violation: {probability: 0.9, type: 'noul'}},
  label,
  labelSource,
  modelProbability: 0.9,
  observedStatus,
  providerIdentifier: 'laya:coreml',
  providerRevision: 'model-1',
  questions: {violation: {instruction: 'Is this a violation?', type: 'noul'}},
  relativePath,
  ruleFingerprint: 'rule-1',
  ruleId: 'filename',
  schemaVersion: 1,
  state: {filename: relativePath},
})

it('should measure decisive labels, abstentions, and classification errors', () => {
  const report = evaluateReviews([
    createRecord('true-positive.ts', 'fail', 'fail'),
    createRecord('false-negative.ts', 'fail', 'pass'),
    createRecord('abstained-failure.ts', 'fail', 'uncertain'),
    createRecord('true-negative.ts', 'pass', 'pass'),
    createRecord('false-positive.ts', 'pass', 'fail'),
    createRecord('correct-uncertain.ts', 'uncertain', 'uncertain'),
    createRecord('incorrect-uncertain.ts', 'uncertain', 'pass'),
    createRecord('unreviewed.ts', 'skip', 'fail'),
    createRecord('accepted-model.ts', 'fail', 'fail', 'accepted-model'),
  ])

  expect(report.totals).toEqual({
    abstained: 1,
    acceptedModelLabels: 1,
    accuracy: 3 / 7,
    confirmed: 5,
    correctUncertain: 1,
    evaluated: 7,
    failLabels: 3,
    falseNegatives: 1,
    falsePositives: 1,
    passLabels: 2,
    precision: 0.5,
    recall: 1 / 3,
    reviewed: 9,
    skipped: 1,
    uncertainLabels: 2,
  })
  expect(report.groups).toHaveLength(1)
  expect(report.groups[0]?.falsePositivePaths).toEqual(['false-positive.ts'])
  expect(report.groups[0]?.falseNegativePaths).toEqual(['false-negative.ts'])
})

it('should separate rule or provider revisions and report insufficient data', () => {
  const second = {
    ...createRecord('second.ts', 'pass', 'pass'),
    providerRevision: 'model-2',
  }
  const report = evaluateReviews([createRecord('first.ts', 'pass', 'pass'), second])

  expect(report.groups).toHaveLength(2)
  expect(report.readiness).toEqual({
    balancedLabels: false,
    enoughConfirmed: false,
    enoughHoldout: false,
    holdout: 0,
    ready: false,
  })
  expect(formatEvaluationReport(report)).toContain('not ready')
})

it('should not count accepted model labels as an independent holdout', () => {
  const confirmed = Array.from({length: 50}, (_, index) =>
    createRecord(
      `confirmed-${index}.ts`,
      index < 25 ? 'fail' : 'pass',
      index < 25 ? 'fail' : 'pass',
    ),
  )
  const acceptedHoldout = Array.from({length: 20}, (_, index) => ({
    ...createRecord(`accepted-${index}.ts`, 'pass', 'pass', 'accepted-model'),
    split: 'holdout' as const,
  }))

  expect(evaluateReviews([...confirmed, ...acceptedHoldout]).readiness).toMatchObject({
    enoughHoldout: false,
    holdout: 0,
    ready: false,
  })
})

it('should not count the same human case twice across provider revisions', () => {
  const cases = Array.from({length: 25}, (_, index) =>
    createRecord(`case-${index}.ts`, index < 13 ? 'fail' : 'pass', index < 13 ? 'fail' : 'pass'),
  )
  const repeated = cases.map((record) => ({...record, providerRevision: 'model-2'}))

  expect(evaluateReviews([...cases, ...repeated]).readiness).toMatchObject({
    enoughConfirmed: false,
    ready: false,
  })
})
