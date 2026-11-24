/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {SUPERTONIC_MODELS, SUPERTONIC_VOICES} from '@winter-love/supertonic/model'
import {
  feedDialogueJobSchema,
  feedDialogueMetadataSchema,
  feedItemRecordSchema,
} from '../feed-dialogue-schema'

const job = {
  createdAt: '2026-10-11T00:00:00.000Z',
  errorMessage: null,
  feedConnectionId: 'connection',
  feedItemId: 'item',
  id: 'job',
  itemTitle: '제목',
  modelId: 'int8',
  publishedAt: '2026-10-11T00:00:00.000Z',
  script: '읽을 내용',
  sourceTitle: '출처',
  sourceUrl: 'https://example.test/item',
  status: 'queued',
  updatedAt: '2026-10-11T00:00:00.000Z',
  version: 1,
} as const

it.each(SUPERTONIC_MODELS)('should preserve the registered $id job model', ({id}) => {
  expect(feedDialogueJobSchema.parse({...job, modelId: id, voiceId: 'Yuna'})).toEqual({
    ...job,
    modelId: id,
    voiceId: 'Yuna',
  })
})

it.each(['unknown', ' full ', null, undefined, 0])(
  'should reject an unsupported job model %s at its field',
  (modelId) => {
    const result = feedDialogueJobSchema.safeParse({...job, modelId, voiceId: 'Yuna'})

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        code: 'invalid_value',
        path: ['modelId'],
        values: ['full', 'int8'],
      }),
    ])
  },
)

it.each(SUPERTONIC_VOICES)('should preserve the registered $id job voice', ({id}) => {
  expect(feedDialogueJobSchema.parse({...job, voiceId: id})).toEqual({...job, voiceId: id})
})

it.each(['default', 'Sarah', 'yuna', ' Yuna ', null])(
  'should reject an unregistered job voice %s at its field',
  (voiceId) => {
    const result = feedDialogueJobSchema.safeParse({...job, voiceId})
    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual([
      {
        code: 'custom',
        message: 'Invalid input',
        path: ['voiceId'],
      },
    ])
  },
)

const DATETIME_PATTERN =
  '/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-' +
  '02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9' +
  ']|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d' +
  '(?:\\.\\d+)?(?:Z))$/'

const metadata = {
  createdAt: '2026-10-11T01:00:00.001Z',
  dialogueId: 'dialogue',
  expiresAt: '2026-10-10T02:00:00.002Z',
  feedConnectionId: 'connection',
  feedItemId: 'item',
  itemTitle: '제목',
  listenedAt: null,
  publishedAt: '2026-10-09T03:00:00.003Z',
  sourceTitle: '출처',
  sourceUrl: 'https://example.test/item',
  version: 1,
} as const

const item = {
  contentLength: 0,
  discoveredAt: '2026-10-12T04:00:00.004Z',
  feedConnectionId: 'connection',
  feedItemId: 'item',
  id: 'record',
  itemTitle: '제목',
  message: null,
  publishedAt: '2026-10-09T03:00:00.003Z',
  sourceTitle: '출처',
  sourceUrl: 'https://example.test/item',
  status: 'ready',
  updatedAt: '2026-10-10T05:00:00.005Z',
  version: 1,
} as const

const formats = [
  {
    keys: [
      'createdAt',
      'dialogueId',
      'expiresAt',
      'feedConnectionId',
      'feedItemId',
      'itemTitle',
      'listenedAt',
      'publishedAt',
      'sourceTitle',
      'sourceUrl',
      'version',
    ],
    name: 'metadata',
    nullable: ['listenedAt'],
    schema: feedDialogueMetadataSchema,
    value: metadata,
  },
  {
    keys: [
      'createdAt',
      'errorMessage',
      'feedConnectionId',
      'feedItemId',
      'id',
      'itemTitle',
      'modelId',
      'publishedAt',
      'script',
      'sourceTitle',
      'sourceUrl',
      'status',
      'updatedAt',
      'version',
      'voiceId',
    ],
    name: 'job',
    nullable: ['errorMessage'],
    schema: feedDialogueJobSchema,
    value: {
      ...job,
      publishedAt: '2026-10-09T03:00:00.003Z',
      updatedAt: '2026-10-10T05:00:00.005Z',
      voiceId: 'Yuna',
    },
  },
  {
    keys: [
      'contentLength',
      'discoveredAt',
      'feedConnectionId',
      'feedItemId',
      'id',
      'itemTitle',
      'message',
      'publishedAt',
      'sourceTitle',
      'sourceUrl',
      'status',
      'updatedAt',
      'version',
    ],
    name: 'item',
    nullable: ['message'],
    schema: feedItemRecordSchema,
    value: item,
  },
] as const

describe.each(formats)('$name persistence schema', ({keys, nullable, schema, value}) => {
  it('should preserve plain output, key order and serialized values while stripping unknown keys', () => {
    const input = Object.freeze({
      extra: {nested: true},
      ...Object.fromEntries(Object.entries(value).toReversed()),
      unused: undefined,
    })
    const output = schema.parse(input)

    expect(output).toEqual(value)
    expect(output).not.toBe(input)
    expect(Object.getPrototypeOf(output)).toBe(Object.prototype)
    expect(Object.keys(output)).toEqual(keys)
    expect(JSON.stringify(output)).toBe(JSON.stringify(value))
    expect(Object.hasOwn(input, 'extra')).toBe(true)
  })

  it.each(keys)('should preserve required and nullable behavior for %s', (key) => {
    const missing = Object.fromEntries(Object.entries(value).filter(([field]) => field !== key))
    const nullResult = schema.safeParse({...value, [key]: null})

    expect(nullResult.success).toBe(nullable.some((field) => field === key))
    if (!nullResult.success) {
      expect(nullResult.error.issues.map((issue) => issue.path)).toEqual([[key]])
    }
    for (const input of [missing, {...value, [key]: undefined}]) {
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([[key]])
    }
  })

  it.each(['feedConnectionId', 'feedItemId', 'itemTitle', 'sourceTitle'])(
    'should retain nonempty whitespace without trimming %s',
    (key) => {
      expect(schema.parse({...value, [key]: ' '})).toEqual({...value, [key]: ' '})
      const result = schema.safeParse({...value, [key]: ''})
      expect(result.error?.issues).toEqual([
        {
          code: 'too_small',
          inclusive: true,
          message: 'Too small: expected string to have >=1 characters',
          minimum: 1,
          origin: 'string',
          path: [key],
        },
      ])
    },
  )

  it.each(['https://example.test:443/a/../b?q=a%20b#part', 'mailto:reader@example.test'])(
    'should preserve the accepted URL %s without coercion',
    (sourceUrl) => {
      expect(schema.parse({...value, sourceUrl})).toEqual({...value, sourceUrl})
    },
  )

  it.each(['2024-02-29T23:59:59.123456Z', '2026-10-09T03:00:00Z'])(
    'should retain published timestamp precision %s',
    (publishedAt) => {
      expect(schema.parse({...value, publishedAt})).toEqual({...value, publishedAt})
    },
  )

  it.each([
    '2026-02-29T00:00:00Z',
    '2026-10-09',
    '2026-10-09T03:00:00+00:00',
    new Date('2026-10-09T03:00:00Z'),
  ])('should reject a published timestamp outside the existing policy: %s', (publishedAt) => {
    const result = schema.safeParse({...value, publishedAt})
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['publishedAt']])
  })

  it.each([0, 2, '1'])('should reject an unsupported version %s', (version) => {
    expect(schema.safeParse({...value, version}).error?.issues).toEqual([
      {
        code: 'invalid_value',
        message: 'Invalid input: expected 1',
        path: ['version'],
        values: [1],
      },
    ])
  })
})

it('should preserve an independent nullable listened timestamp without date ordering checks', () => {
  const listenedAt = '2026-10-13T06:00:00.006Z'
  expect(feedDialogueMetadataSchema.parse({...metadata, listenedAt})).toEqual({
    ...metadata,
    listenedAt,
  })
})

it.each(['', 'failure detail'])('should retain nullable string messages %s', (message) => {
  expect(feedDialogueJobSchema.parse({...job, errorMessage: message, voiceId: 'Yuna'})).toEqual({
    ...job,
    errorMessage: message,
    voiceId: 'Yuna',
  })
  expect(feedItemRecordSchema.parse({...item, message})).toEqual({...item, message})
})

it.each([
  'dismissed',
  'failed',
  'generating',
  'ignored',
  'interrupted',
  'pending',
  'queued',
  'ready',
  'too-long',
  'unknown',
])('should keep job and item status policies distinct for %s', (status) => {
  const jobResult = feedDialogueJobSchema.safeParse({...job, status, voiceId: 'Yuna'})
  const itemResult = feedItemRecordSchema.safeParse({...item, status})
  expect(jobResult.success).toBe(
    ['failed', 'generating', 'interrupted', 'pending', 'queued'].includes(status),
  )
  expect(itemResult.success).toBe(
    ['dismissed', 'failed', 'ignored', 'queued', 'ready', 'too-long'].includes(status),
  )
  if (jobResult.success) {
    expect(jobResult.data).toEqual({...job, status, voiceId: 'Yuna'})
  }
  if (itemResult.success) {
    expect(itemResult.data).toEqual({...item, status})
  }
})

it.each([0, -0, 1, Number.MAX_SAFE_INTEGER])(
  'should retain integer content length %s',
  (contentLength) => {
    const output = feedItemRecordSchema.parse({...item, contentLength})
    expect(output).toEqual({...item, contentLength})
    expect(Object.is(output.contentLength, contentLength)).toBe(true)
  },
)

it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Infinity, -Infinity, '1'])(
  'should reject content length outside the existing numeric policy: %s',
  (contentLength) => {
    const result = feedItemRecordSchema.safeParse({...item, contentLength})
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['contentLength']])
  },
)

it.each(['a', 'a'.repeat(3000), '🙂'.repeat(1500)])(
  'should preserve script length at the accepted boundary (%#)',
  (script) => {
    expect(feedDialogueJobSchema.parse({...job, script, voiceId: 'Yuna'})).toEqual({
      ...job,
      script,
      voiceId: 'Yuna',
    })
  },
)

it.each(['', 'a'.repeat(3001)])(
  'should reject script length outside the boundary (%#)',
  (script) => {
    const result = feedDialogueJobSchema.safeParse({...job, script, voiceId: 'Yuna'})
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['script']])
  },
)

it('should preserve raw metadata issues in field order across shared and local fields', () => {
  const result = feedDialogueMetadataSchema.safeParse({
    ...metadata,
    dialogueId: '',
    feedConnectionId: '',
    itemTitle: null,
    listenedAt: 'invalid',
    sourceUrl: 'relative',
    version: 2,
  })
  expect(result.error?.issues).toEqual([
    {
      code: 'too_small',
      inclusive: true,
      message: 'Too small: expected string to have >=1 characters',
      minimum: 1,
      origin: 'string',
      path: ['dialogueId'],
    },
    {
      code: 'too_small',
      inclusive: true,
      message: 'Too small: expected string to have >=1 characters',
      minimum: 1,
      origin: 'string',
      path: ['feedConnectionId'],
    },
    {
      code: 'invalid_type',
      expected: 'string',
      message: 'Invalid input: expected string, received null',
      path: ['itemTitle'],
    },
    {
      code: 'invalid_format',
      format: 'datetime',
      message: 'Invalid ISO datetime',
      origin: 'string',
      path: ['listenedAt'],
      pattern: DATETIME_PATTERN,
    },
    {
      code: 'invalid_format',
      format: 'url',
      message: 'Invalid URL',
      path: ['sourceUrl'],
    },
    {
      code: 'invalid_value',
      message: 'Invalid input: expected 1',
      path: ['version'],
      values: [1],
    },
  ])
})

it('should preserve raw job issues in field order across shared and local fields', () => {
  const result = feedDialogueJobSchema.safeParse({
    ...job,
    feedConnectionId: '',
    id: '',
    publishedAt: 'invalid',
    script: '',
    status: 'ready',
    voiceId: 'unknown',
  })
  expect(result.error?.issues).toEqual([
    {
      code: 'too_small',
      inclusive: true,
      message: 'Too small: expected string to have >=1 characters',
      minimum: 1,
      origin: 'string',
      path: ['feedConnectionId'],
    },
    {
      code: 'too_small',
      inclusive: true,
      message: 'Too small: expected string to have >=1 characters',
      minimum: 1,
      origin: 'string',
      path: ['id'],
    },
    {
      code: 'invalid_format',
      format: 'datetime',
      message: 'Invalid ISO datetime',
      origin: 'string',
      path: ['publishedAt'],
      pattern: DATETIME_PATTERN,
    },
    {
      code: 'too_small',
      inclusive: true,
      message: 'Too small: expected string to have >=1 characters',
      minimum: 1,
      origin: 'string',
      path: ['script'],
    },
    {
      code: 'invalid_value',
      message:
        'Invalid option: expected one of "failed"|"generating"|"interrupted"|"pending"|"queued"',
      path: ['status'],
      values: ['failed', 'generating', 'interrupted', 'pending', 'queued'],
    },
    {
      code: 'custom',
      message: 'Invalid input',
      path: ['voiceId'],
    },
  ])
})

it('should preserve raw item issues in field order across shared and local fields', () => {
  const result = feedItemRecordSchema.safeParse({
    ...item,
    contentLength: -0.5,
    discoveredAt: 'invalid',
    feedItemId: null,
    message: 0,
    sourceTitle: '',
    status: 'generating',
    version: 2,
  })
  expect(result.error?.issues).toEqual([
    {
      code: 'invalid_type',
      expected: 'int',
      format: 'safeint',
      message: 'Invalid input: expected int, received number',
      path: ['contentLength'],
    },
    {
      code: 'invalid_format',
      format: 'datetime',
      message: 'Invalid ISO datetime',
      origin: 'string',
      path: ['discoveredAt'],
      pattern: DATETIME_PATTERN,
    },
    {
      code: 'invalid_type',
      expected: 'string',
      message: 'Invalid input: expected string, received null',
      path: ['feedItemId'],
    },
    {
      code: 'invalid_type',
      expected: 'string',
      message: 'Invalid input: expected string, received number',
      path: ['message'],
    },
    {
      code: 'too_small',
      inclusive: true,
      message: 'Too small: expected string to have >=1 characters',
      minimum: 1,
      origin: 'string',
      path: ['sourceTitle'],
    },
    {
      code: 'invalid_value',
      message:
        'Invalid option: expected one of "dismissed"|"failed"|"ignored"|"queued"|"ready"|"too-long"',
      path: ['status'],
      values: ['dismissed', 'failed', 'ignored', 'queued', 'ready', 'too-long'],
    },
    {
      code: 'invalid_value',
      message: 'Invalid input: expected 1',
      path: ['version'],
      values: [1],
    },
  ])
})
