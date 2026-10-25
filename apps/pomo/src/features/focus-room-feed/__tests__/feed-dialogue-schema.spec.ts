/** @vitest-environment node */
import {expect, it} from 'vitest'
import {SUPERTONIC_MODELS, SUPERTONIC_VOICES} from '../../supertonic/model'
import {feedDialogueJobSchema} from '../feed-dialogue-schema'

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
      {code: 'custom', message: 'Invalid input', path: ['voiceId']},
    ])
  },
)
