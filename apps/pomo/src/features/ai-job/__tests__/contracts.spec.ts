/** @vitest-environment node */

import {describe, expect, it} from 'vitest'

import {aiJobSchema, aiTextJobInputSchema} from '../contracts'

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

describe('aiTextJobInputSchema message roles', () => {
  const createInput = (role: unknown) => ({messages: [{content: '  질문  ', role}]})

  it.each(['assistant', 'system', 'user'])(
    'should accept the %s role while retaining trimmed content and omitted parameters',
    (role) => {
      expect(aiTextJobInputSchema.parse(createInput(role))).toEqual({
        messages: [{content: '질문', role}],
      })
    },
  )

  it.each(['developer', 'tool', ' user ', null, undefined, 0])(
    'should reject unsupported message role %s with the ordered role diagnostic',
    (role) => {
      const result = aiTextJobInputSchema.safeParse(createInput(role))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toEqual([
          expect.objectContaining({
            code: 'invalid_value',
            path: ['messages', 0, 'role'],
            values: ['assistant', 'system', 'user'],
          }),
        ])
      }
    },
  )
})

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
