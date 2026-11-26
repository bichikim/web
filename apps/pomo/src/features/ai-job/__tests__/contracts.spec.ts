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

describe('aiTextJobInputSchema input rules', () => {
  const messages = [{content: '  질문  ', role: 'user'}]
  const parsedMessages = [{content: '질문', role: 'user'}]

  it.each([
    [{messages}, {messages: parsedMessages}],
    [
      {messages, parameters: undefined},
      {messages: parsedMessages, parameters: undefined},
    ],
    [
      {messages, parameters: {}},
      {messages: parsedMessages, parameters: {}},
    ],
    [
      {messages, parameters: {maximumTokens: undefined, temperature: 1}},
      {messages: parsedMessages, parameters: {maximumTokens: undefined, temperature: 1}},
    ],
  ])('should preserve omitted and explicit undefined parameters: %j', (input, expected) => {
    expect(aiTextJobInputSchema.parse(input)).toStrictEqual(expected)
  })

  it.each([
    {maximumTokens: 1, temperature: 0, topP: 0},
    {maximumTokens: 4096, temperature: 2, topP: 1},
  ])('should accept inclusive numeric limits: %j', (parameters) => {
    expect(aiTextJobInputSchema.parse({messages, parameters})).toStrictEqual({
      messages: parsedMessages,
      parameters,
    })
  })

  it.each([
    ['maximumTokens', 0],
    ['maximumTokens', 4097],
    ['maximumTokens', 1.5],
    ['temperature', -0.1],
    ['temperature', 2.1],
    ['topP', -0.1],
    ['topP', 1.1],
    ['maximumTokens', null],
    ['maximumTokens', '1'],
    ['maximumTokens', Number.NaN],
    ['temperature', Number.POSITIVE_INFINITY],
    ['topP', Number.NEGATIVE_INFINITY],
  ])('should reject invalid %s value %s', (field, value) => {
    const result = aiTextJobInputSchema.safeParse({messages, parameters: {[field]: value}})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['parameters', field])
    }
  })

  it.each([1, 64])('should accept %s trimmed messages at the content limit', (count) => {
    const content = 'x'.repeat(12_000)
    const input = {
      messages: Array.from({length: count}, () => ({content: ` ${content} `, role: 'user'})),
    }
    const result = aiTextJobInputSchema.parse(input)
    expect(result.messages).toHaveLength(count)
    expect(result.messages.every((message) => message.content === content)).toBe(true)
    expect(input.messages[0]?.content).toBe(` ${content} `)
  })

  it.each([
    [],
    Array.from({length: 65}, () => messages[0]),
    [{content: ' \n\t ', role: 'user'}],
    [{content: 'x'.repeat(12_001), role: 'user'}],
  ])('should reject messages outside the count or trimmed content limits', (invalidMessages) => {
    expect(aiTextJobInputSchema.safeParse({messages: invalidMessages}).success).toBe(false)
  })

  it('should strip unknown fields at each input level without adding defaults', () => {
    expect(
      aiTextJobInputSchema.parse({
        extra: true,
        messages: [{...messages[0], extra: true}],
        parameters: {extra: true},
      }),
    ).toStrictEqual({messages: parsedMessages, parameters: {}})
  })

  it('should report message issues before ordered parameter issues', () => {
    const result = aiTextJobInputSchema.safeParse({
      messages: [{content: '', role: 'tool'}],
      parameters: {maximumTokens: 0, temperature: 3, topP: -1},
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map(({code, path}) => ({code, path}))).toEqual([
        {code: 'too_small', path: ['messages', 0, 'content']},
        {code: 'invalid_value', path: ['messages', 0, 'role']},
        {code: 'too_small', path: ['parameters', 'maximumTokens']},
        {code: 'too_big', path: ['parameters', 'temperature']},
        {code: 'too_small', path: ['parameters', 'topP']},
      ])
    }
  })
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
