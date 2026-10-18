/** @vitest-environment node */

import {expect, it} from 'vitest'

import {aiJobSchema} from '../contracts'

const createJob = (status: unknown) => ({
  capability: 'text',
  completedAt: null,
  createdAt: '2026-10-11T00:00:00Z',
  error: null,
  id: 'job',
  lastRunnerError: null,
  modelId: 'model',
  progress: 0,
  result: null,
  startedAt: null,
  status,
  timeoutAt: '2026-10-11T01:00:00Z',
  updatedAt: '2026-10-11T00:00:00Z',
})

it.each(['queued', 'running', 'recovery_pending', 'succeeded', 'failed', 'cancelled', 'timed_out'])(
  'should preserve the %s status when parsing a job response',
  (status) => {
    const job = createJob(status)

    expect(aiJobSchema.parse(job)).toEqual(job)
  },
)

it.each(['submitting', 'error', ' queued ', '', null, undefined, 0])(
  'should reject the unsupported job status %s at its response field',
  (status) => {
    const result = aiJobSchema.safeParse(createJob(status))

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toMatchObject([
        {
          code: 'invalid_value',
          path: ['status'],
          values: [
            'queued',
            'running',
            'recovery_pending',
            'succeeded',
            'failed',
            'cancelled',
            'timed_out',
          ],
        },
      ])
    }
  },
)
