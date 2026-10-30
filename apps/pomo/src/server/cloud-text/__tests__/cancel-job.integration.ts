/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {eq} from 'drizzle-orm'
import {afterAll, afterEach, beforeAll, beforeEach, expect, it, vi} from 'vitest'
import {apiAiAttempts, apiAiJobs, getDatabase, withTransactionalDatabase} from 'src/server/database'
import {getApiAiProviders} from 'src/server/api-ai/providers'
import {responsesAdapter} from 'src/server/api-ai/responses-adapter'
import type {ApiAiProvider, ApiAiResponse, ApiAiStatus} from 'src/server/api-ai/types'
import {
  claimApiAiJob,
  findApiAiJob,
  recordApiAiResponse,
  recordApiAiSubmissionError,
} from 'src/server/repositories/api-ai'
import {prepareApiAiQueue} from './fixtures/api-ai-queue'
import {cancelCloudTextJob} from '../cancel-job'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema/api-ai')),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))
vi.mock('src/server/api-ai/providers', () => ({getApiAiProviders: vi.fn()}))
vi.mock('src/server/api-ai/responses-adapter', () => ({
  responsesAdapter: {cancel: vi.fn(), retrieve: vi.fn()},
}))

const database = new PGlite()
const client = drizzle(database, {casing: 'snake_case'})
const owner = '10000000-0000-4000-8000-000000000001'
const provider: ApiAiProvider = {
  apiKey: 'local-test',
  baseUrl: 'https://provider.invalid',
  id: 'primary',
  models: {'cloud-text': 'model'},
  poolId: 'local',
}
const response: ApiAiResponse = {
  failureCode: null,
  fallback: false,
  metadata: {},
  model: 'model',
  outputText: 'complete',
  responseId: 'response-1',
  searchSourceUrls: [],
  status: 'completed',
  tokenCount: 10,
}
const enqueue = async (status: ApiAiStatus = 'queued') => {
  const id = crypto.randomUUID()
  await client.insert(apiAiJobs).values({
    body: {max_output_tokens: 100},
    generationMilliseconds: 120000,
    id,
    kind: 'cloud-text',
    ownerId: owner,
    queueExpiresAt: new Date(Date.now() + 900000),
    requestHash: 'a'.repeat(64),
    status,
  })
  return id
}
const start = async () => {
  const id = await enqueue()
  const claim = await claimApiAiJob(id, [provider], new Date(), crypto.randomUUID())
  if (claim === null) {
    throw new Error('Expected an active attempt')
  }
  return claim
}

beforeAll(async () => {
  await database.exec(
    `create table pomo_users (id uuid primary key);
    create table cloud_text_requests (id uuid primary key);
    insert into pomo_users values ('${owner}')`,
  )
  await prepareApiAiQueue(database)
  vi.mocked(getDatabase).mockReturnValue(client as unknown as ReturnType<typeof getDatabase>)
  vi.mocked(withTransactionalDatabase).mockImplementation(async (operation) =>
    operation(client as unknown as Parameters<typeof operation>[0]),
  )
})
beforeEach(() => {
  vi.mocked(getApiAiProviders).mockReturnValue([provider])
  vi.mocked(responsesAdapter.cancel).mockResolvedValue({...response, status: 'cancelled'})
  vi.mocked(responsesAdapter.retrieve).mockResolvedValue(response)
})
afterEach(async () => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  await database.exec('truncate api_ai_jobs, api_ai_attempts, api_ai_pools cascade')
})
afterAll(async () => {
  await database.close()
})

it('should retain cancellation when a rejected submission returns to the queue during cancellation', async () => {
  const claim = await start()
  const query = database.query.bind(database)
  let rejected = false
  // Yield after the first real cancellation write, where the old two-write path lost cancellation.
  vi.spyOn(database, 'query').mockImplementation(async (...arguments_) => {
    const result = await query(...arguments_)
    if (!rejected && arguments_[0].startsWith('update "api_ai_jobs"')) {
      rejected = true
      await recordApiAiSubmissionError(
        claim.attempt.id,
        {
          acceptance: 'rejected',
          disabled: false,
          fallback: true,
          message: 'rate limited',
          retryAt: Date.now(),
        },
        new Date(),
      )
    }
    return result
  })
  expect(await cancelCloudTextJob(owner, claim.job.id)).toBe(true)
  expect(rejected).toBe(true)
  expect(await client.select().from(apiAiAttempts)).toMatchObject([{state: 'rejected'}])
  expect(await findApiAiJob(claim.job.id)).toMatchObject({
    cancelRequestedAt: expect.any(Date),
    status: 'cancelled',
  })
  expect(
    await claimApiAiJob(
      claim.job.id,
      [{...provider, id: 'secondary'}],
      new Date(),
      crypto.randomUUID(),
    ),
  ).toBeNull()
  expect(await client.select().from(apiAiAttempts)).toHaveLength(1)
})

it('should terminate queued work without contacting a provider and acknowledge repeated cancellation', async () => {
  const id = await enqueue()
  expect(await cancelCloudTextJob(owner, id)).toBe(true)
  expect(await cancelCloudTextJob(owner, id)).toBe(true)
  const [job] = await client.select().from(apiAiJobs).where(eq(apiAiJobs.id, id))
  expect(job).toMatchObject({
    cancelRequestedAt: expect.any(Date),
    completedAt: expect.any(Date),
    status: 'cancelled',
  })
  expect(responsesAdapter.cancel).not.toHaveBeenCalled()
})

it('should keep unacknowledged submission active until completion then preserve cancellation', async () => {
  const claim = await start()
  const [before] = await client.select().from(apiAiJobs).where(eq(apiAiJobs.id, claim.job.id))
  expect(await cancelCloudTextJob(owner, claim.job.id)).toBe(true)
  expect(await client.select().from(apiAiJobs).where(eq(apiAiJobs.id, claim.job.id))).toMatchObject(
    [{completedAt: null, nextAttemptAt: before.nextAttemptAt}],
  )
  expect(await findApiAiJob(claim.job.id)).toMatchObject({
    cancelRequestedAt: expect.any(Date),
    status: 'submitting',
  })
  expect(responsesAdapter.cancel).not.toHaveBeenCalled()
  await recordApiAiResponse(claim.attempt.id, response, new Date())
  expect(await findApiAiJob(claim.job.id)).toMatchObject({status: 'cancelled'})
})

it('should cancel requeued work without contacting the previous terminal provider response', async () => {
  const claim = await start()
  await recordApiAiResponse(
    claim.attempt.id,
    {...response, fallback: true, status: 'failed'},
    new Date(),
  )
  expect(await findApiAiJob(claim.job.id)).toMatchObject({status: 'queued'})
  expect(await cancelCloudTextJob(owner, claim.job.id)).toBe(true)
  expect(await findApiAiJob(claim.job.id)).toMatchObject({status: 'cancelled'})
  expect(responsesAdapter.cancel).not.toHaveBeenCalled()
})

it.each(['running', 'recovery_pending'] as const)(
  'should request provider cancellation for %s work and retrieve completion if cancellation loses the race',
  async (status) => {
    const claim = await start()
    await recordApiAiResponse(claim.attempt.id, {...response, status: 'in_progress'}, new Date())
    await client.update(apiAiJobs).set({status}).where(eq(apiAiJobs.id, claim.job.id))
    vi.mocked(responsesAdapter.cancel).mockRejectedValue(new Error('already completed'))
    expect(await cancelCloudTextJob(owner, claim.job.id)).toBe(true)
    expect(responsesAdapter.cancel).toHaveBeenCalledExactlyOnceWith(provider, response.responseId)
    expect(responsesAdapter.retrieve).toHaveBeenCalledExactlyOnceWith(provider, response.responseId)
    expect(await findApiAiJob(claim.job.id)).toMatchObject({status: 'cancelled'})
  },
)

it('should persist provider cancellation without retrieving the response again', async () => {
  const claim = await start()
  await recordApiAiResponse(claim.attempt.id, {...response, status: 'in_progress'}, new Date())
  expect(await cancelCloudTextJob(owner, claim.job.id)).toBe(true)
  expect(responsesAdapter.cancel).toHaveBeenCalledExactlyOnceWith(provider, response.responseId)
  expect(responsesAdapter.retrieve).not.toHaveBeenCalled()
  expect(await findApiAiJob(claim.job.id)).toMatchObject({status: 'cancelled'})
})

it('should retain the durable request if both provider cancellation and retrieval fail', async () => {
  const claim = await start()
  await recordApiAiResponse(claim.attempt.id, {...response, status: 'in_progress'}, new Date())
  const error = new Error('provider unavailable')
  vi.mocked(responsesAdapter.cancel).mockRejectedValue(error)
  vi.mocked(responsesAdapter.retrieve).mockRejectedValue(error)
  await expect(cancelCloudTextJob(owner, claim.job.id)).rejects.toBe(error)
  expect(await findApiAiJob(claim.job.id)).toMatchObject({
    cancelRequestedAt: expect.any(Date),
    status: 'running',
  })
})

it.each(['succeeded', 'failed', 'cancelled'] as const)(
  'should acknowledge an owned terminal %s job without changing its result or timestamps',
  async (status) => {
    const id = await enqueue(status)
    await client
      .update(apiAiJobs)
      .set({completedAt: new Date('2026-10-01T00:00:00Z'), result: response})
      .where(eq(apiAiJobs.id, id))
    const [before] = await client.select().from(apiAiJobs).where(eq(apiAiJobs.id, id))
    expect(await cancelCloudTextJob(owner, id)).toBe(true)
    expect(await client.select().from(apiAiJobs).where(eq(apiAiJobs.id, id))).toEqual([before])
    expect(responsesAdapter.cancel).not.toHaveBeenCalled()
  },
)

it('should reject missing, foreign-owned, and non-cloud work without altering it', async () => {
  const id = await enqueue()
  expect(await cancelCloudTextJob(owner, crypto.randomUUID())).toBe(false)
  expect(await cancelCloudTextJob(crypto.randomUUID(), id)).toBe(false)
  await client.update(apiAiJobs).set({kind: 'history'}).where(eq(apiAiJobs.id, id))
  expect(await cancelCloudTextJob(owner, id)).toBe(false)
  expect(await findApiAiJob(id)).toMatchObject({cancelRequestedAt: null, status: 'queued'})
  expect(responsesAdapter.cancel).not.toHaveBeenCalled()
})
