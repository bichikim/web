/** @vitest-environment node */
import {expect, it} from 'vitest'
import {classifyRuns} from '../classify-runs'

it('should classify submitted responses and ambiguous submissions in row order', () => {
  expect(
    classifyRuns([
      {id: 'run-preparing', responseId: null, status: 'preparing', submissionState: null},
      {id: 'run-unknown', responseId: null, status: 'preparing', submissionState: 'unknown'},
      {id: 'run-missing', responseId: null, status: 'submitted', submissionState: null},
      {id: 'run-1', responseId: 'resp-1', status: 'submitted', submissionState: null},
      {id: 'run-2', responseId: 'resp-2', status: 'submitted', submissionState: null},
    ]),
  ).toEqual([
    {kind: 'submission_unknown', runId: 'run-preparing'},
    {kind: 'submission_unknown', runId: 'run-unknown'},
    {kind: 'response', responseId: 'resp-1'},
    {kind: 'response', responseId: 'resp-2'},
  ])
})

it('should return no recovery candidates for an empty result', () => {
  expect(classifyRuns([])).toEqual([])
})

it('should skip expired submissions and terminal generation runs', () => {
  expect(
    classifyRuns([
      {id: 'run-expired', responseId: null, status: 'preparing', submissionState: 'expired'},
      {
        id: 'run-completed',
        responseId: 'resp-completed',
        status: 'completed',
        submissionState: null,
      },
      {id: 'run-failed', responseId: 'resp-failed', status: 'failed', submissionState: null},
      {id: 'run-rejected', responseId: null, status: 'rejected', submissionState: null},
    ]),
  ).toEqual([])
})
