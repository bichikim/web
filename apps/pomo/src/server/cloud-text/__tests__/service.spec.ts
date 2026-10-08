import type {CloudTextRequest} from 'src/features/cloud-text/contracts'
import {beforeEach, expect, it, vi} from 'vitest'
import {findApiAiJob} from 'src/server/repositories/api-ai'
import {reserveCloudText} from '../quota'
import {generateCloudText} from '../service'

vi.mock('src/env', () => ({
  env: {DATABASE_URL_UNPOOLED: 'postgresql://example/db', POMO_AI_QUEUE_LIMIT: 100},
}))
vi.mock('src/server/api-ai/providers', () => ({getApiAiProviders: vi.fn().mockReturnValue([])}))
vi.mock('src/server/repositories/api-ai', () => ({findApiAiJob: vi.fn()}))
vi.mock('../quota', () => ({reserveCloudText: vi.fn()}))
const usage = {
  day: '2026-10-07',
  limit: 3,
  remaining: 2,
  resetsAt: '2026-10-07T15:00:00.000Z',
  used: 1,
}
const request: CloudTextRequest = {
  maximumTokens: 2560,
  messages: [{content: '타로를 해석하세요.', role: 'user'}],
  requestId: '00000000-0000-4000-8000-000000000001',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(reserveCloudText).mockResolvedValue({kind: 'reserved', usage})
  vi.mocked(findApiAiJob).mockResolvedValue({ownerId: 'user'} as NonNullable<
    Awaited<ReturnType<typeof findApiAiJob>>
  >)
})

it('should atomically reserve a queued request and acknowledge it without waiting for generation', async () => {
  expect(await generateCloudText('user', request)).toEqual({
    kind: 'accepted',
    requestId: request.requestId,
    usage,
  })
  expect(reserveCloudText).toHaveBeenCalledWith(
    expect.objectContaining({
      queue: expect.objectContaining({
        input: expect.objectContaining({
          body: expect.objectContaining({max_output_tokens: 2560, reasoning: {effort: 'none'}}),
          id: request.requestId,
          ownerId: 'user',
        }),
      }),
      requestId: request.requestId,
    }),
  )
})
it.each(['exhausted', 'queue_full', 'conflict', 'failed'] as const)(
  'should return %s before reading a job',
  async (kind) => {
    vi.mocked(reserveCloudText).mockResolvedValue({kind, usage})
    expect(await generateCloudText('user', request)).toEqual({kind, usage})
    expect(findApiAiJob).not.toHaveBeenCalled()
  },
)
it('should replay a completed request without queueing or another charge', async () => {
  vi.mocked(reserveCloudText).mockResolvedValue({
    kind: 'existing',
    text: '저장된 리딩',
    tokenCount: 200,
    usage,
  })
  expect(await generateCloudText('user', request)).toEqual({
    kind: 'complete',
    text: '저장된 리딩',
    tokenCount: 200,
    usage,
  })
  expect(findApiAiJob).not.toHaveBeenCalled()
})
it('should reject a pending request belonging to another owner', async () => {
  vi.mocked(findApiAiJob).mockResolvedValue({ownerId: 'other'} as NonNullable<
    Awaited<ReturnType<typeof findApiAiJob>>
  >)
  expect(await generateCloudText('user', request)).toEqual({kind: 'failed', usage})
})
