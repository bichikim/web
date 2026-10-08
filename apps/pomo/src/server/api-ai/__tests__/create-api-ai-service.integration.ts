/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {eq} from 'drizzle-orm'
import {afterAll, afterEach, beforeAll, beforeEach, expect, it, vi} from 'vitest'
import {
  apiAiCallbacks,
  apiAiJobs,
  getDatabase,
  withTransactionalDatabase,
} from 'src/server/database'
import * as repository from 'src/server/repositories/api-ai'
import {prepareApiAiQueue} from 'src/server/cloud-text/__tests__/fixtures/api-ai-queue'
import {createApiAiService} from '../create-api-ai-service'
import type {ApiAiProvider, ApiAiResponse} from '../types'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema/api-ai')),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))
const database = new PGlite()
const client = drizzle(database, {casing: 'snake_case'})
const now = new Date('2026-10-09T00:00:00Z')
const provider: ApiAiProvider = {
  apiKey: 'key',
  baseUrl: 'https://api.example/v1',
  id: 'openai',
  models: {history: 'model'},
  poolId: 'primary',
  webhookSecret: 'secret',
}
const response: ApiAiResponse = {
  failureCode: null,
  fallback: false,
  metadata: {},
  model: 'model',
  outputText: 'complete',
  responseId: 'response',
  searchSourceUrls: [],
  status: 'completed',
  tokenCount: 10,
}
const adapter = {cancel: vi.fn(), retrieve: vi.fn(), submit: vi.fn()}
const deliver = vi.fn()
const legacyWebhook = vi.fn()
const service = createApiAiService({
  adapter,
  clock: () => now,
  createAttemptId: () => crypto.randomUUID(),
  deliver,
  legacyWebhook,
  providers: () => [provider],
  repository,
})

beforeAll(async () => {
  await database.exec(
    'create table pomo_users (id uuid primary key); create table cloud_text_requests (id uuid primary key)',
  )
  await prepareApiAiQueue(database)
})
beforeEach(() => {
  vi.mocked(getDatabase).mockReturnValue(client as unknown as ReturnType<typeof getDatabase>)
  vi.mocked(withTransactionalDatabase).mockImplementation(async (operation) =>
    operation(client as unknown as Parameters<typeof operation>[0]),
  )
})
afterEach(async () => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
  await database.exec(
    'truncate api_ai_jobs, api_ai_attempts, api_ai_pools, api_ai_callbacks cascade',
  )
})
afterAll(async () => {
  await database.close()
})

it('should process a later callback despite a full batch of repeatedly failing callbacks', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await client.insert(apiAiCallbacks).values(
    Array.from({length: 11}, (_, index) => ({
      eventId: `event-${index}`,
      eventType: 'response.completed' as const,
      providerId: 'openai',
      receivedAt: new Date(now.getTime() - 1000 + index),
      responseId: `response-${index}`,
    })),
  )
  adapter.retrieve.mockImplementation(async (_selected, responseId) => {
    if (responseId !== 'response-10') {
      throw new Error('Unavailable provider response')
    }
    return {metadata: {}, responseId}
  })
  await service.complete()
  await service.complete()
  const [last] = await client
    .select()
    .from(apiAiCallbacks)
    .where(eq(apiAiCallbacks.eventId, 'event-10'))
  expect(last.processedAt).not.toBeNull()
  expect(legacyWebhook).toHaveBeenCalledOnce()
})

it('should deliver a later result despite a full batch of repeatedly failing deliveries', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const ids = Array.from({length: 11}, () => crypto.randomUUID())
  await client.insert(apiAiJobs).values(
    ids.map((id, index) => ({
      body: {},
      completedAt: new Date(now.getTime() - 1000 + index),
      generationMilliseconds: 120000,
      id,
      kind: 'history' as const,
      nextAttemptAt: now,
      ownerId: null,
      queueExpiresAt: now,
      requestHash: 'a'.repeat(64),
      status: 'succeeded' as const,
    })),
  )
  deliver.mockImplementation(async (job) => {
    if (job.id !== ids[10]) {
      throw new Error('Consumer database unavailable')
    }
  })
  await service.complete()
  const [last] = await client.select().from(apiAiJobs).where(eq(apiAiJobs.id, ids[10]!))
  expect(last.deliveredAt).not.toBeNull()
})

it('should process one callback once across overlapping service invocations', async () => {
  await repository.enqueueApiAiCallback(
    'openai',
    {
      data: {id: 'response'},
      id: 'event',
      type: 'response.completed',
    },
    now,
  )
  adapter.retrieve.mockResolvedValue({metadata: {}, responseId: 'response'})
  await Promise.all([service.complete(), service.complete()])
  expect(adapter.retrieve).toHaveBeenCalledOnce()
  expect(legacyWebhook).toHaveBeenCalledOnce()
  expect((await client.select().from(apiAiCallbacks))[0].processedAt).not.toBeNull()
})

it('should retry a failed callback when its durable retry becomes due', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await repository.enqueueApiAiCallback(
    'openai',
    {
      data: {id: 'response'},
      id: 'event',
      type: 'response.completed',
    },
    now,
  )
  adapter.retrieve
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({metadata: {}, responseId: 'response'})
  await service.complete()
  expect((await client.select().from(apiAiCallbacks))[0].processedAt).toBeNull()
  await createApiAiService({
    adapter,
    clock: () => new Date(now.getTime() + 61000),
    createAttemptId: () => crypto.randomUUID(),
    deliver,
    legacyWebhook,
    providers: () => [provider],
    repository,
  }).complete()
  expect(adapter.retrieve).toHaveBeenCalledTimes(2)
  expect((await client.select().from(apiAiCallbacks))[0].processedAt).not.toBeNull()
})

it('should deliver one terminal job once across overlapping service invocations', async () => {
  const id = crypto.randomUUID()
  await client.insert(apiAiJobs).values({
    body: {},
    completedAt: now,
    generationMilliseconds: 120000,
    id,
    kind: 'history',
    nextAttemptAt: now,
    ownerId: null,
    queueExpiresAt: now,
    requestHash: 'a'.repeat(64),
    status: 'succeeded',
  })
  await Promise.all([service.complete(), service.complete()])
  expect(deliver).toHaveBeenCalledOnce()
  expect((await client.select().from(apiAiJobs))[0].deliveredAt).not.toBeNull()
})

it('should retry a failed delivery when its durable retry becomes due', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const id = crypto.randomUUID()
  await client.insert(apiAiJobs).values({
    body: {},
    completedAt: now,
    generationMilliseconds: 120000,
    id,
    kind: 'history',
    nextAttemptAt: now,
    ownerId: null,
    queueExpiresAt: now,
    requestHash: 'a'.repeat(64),
    status: 'succeeded',
  })
  deliver.mockRejectedValueOnce(new Error('database')).mockResolvedValue(undefined)
  await service.complete()
  expect((await client.select().from(apiAiJobs))[0].deliveredAt).toBeNull()
  await createApiAiService({
    adapter,
    clock: () => new Date(now.getTime() + 61000),
    createAttemptId: () => crypto.randomUUID(),
    deliver,
    legacyWebhook,
    providers: () => [provider],
    repository,
  }).complete()
  expect(deliver).toHaveBeenCalledTimes(2)
  expect((await client.select().from(apiAiJobs))[0].deliveredAt).not.toBeNull()
})

it('should return after background acceptance and complete its durable job through a later callback', async () => {
  const id = crypto.randomUUID()
  await repository.createApiAiJob(
    {
      body: {max_output_tokens: 100},
      generationMilliseconds: 120000,
      id,
      kind: 'history',
      ownerId: null,
      queueExpiresAt: new Date(now.getTime() + 900000),
      requestHash: 'a'.repeat(64),
    },
    10,
    now,
  )
  adapter.submit.mockResolvedValue({
    ...response,
    outputText: '',
    status: 'queued',
    tokenCount: null,
  })
  await service.dispatchJob(id)
  const job = await repository.findApiAiJob(id)
  expect(job?.status).toBe('running')
  expect(adapter.submit).toHaveBeenCalledOnce()
  expect(adapter.retrieve).not.toHaveBeenCalled()
  expect(deliver).not.toHaveBeenCalled()
  if (job?.activeAttemptId === null || job?.activeAttemptId === undefined) {
    throw new Error('Expected an accepted attempt')
  }
  adapter.retrieve.mockResolvedValue({
    ...response,
    metadata: {pomo_api_attempt_id: job.activeAttemptId, pomo_api_job_id: id},
  })
  await repository.enqueueApiAiCallback(
    'openai',
    {
      data: {id: response.responseId},
      id: 'completed',
      type: 'response.completed',
    },
    now,
  )
  await createApiAiService({
    adapter,
    clock: () => now,
    createAttemptId: () => crypto.randomUUID(),
    deliver,
    legacyWebhook,
    providers: () => [provider],
    repository,
  }).complete()
  expect(await repository.findApiAiJob(id)).toMatchObject({
    result: {outputText: 'complete'},
    status: 'succeeded',
  })
  expect(deliver).toHaveBeenCalledOnce()
  expect((await client.select().from(apiAiJobs))[0].deliveredAt).toEqual(now)
})

it('should dispatch to a second API after confirmed rejection without waiting for generation', async () => {
  const id = crypto.randomUUID()
  await repository.createApiAiJob(
    {
      body: {max_output_tokens: 100},
      generationMilliseconds: 120000,
      id,
      kind: 'history',
      ownerId: null,
      queueExpiresAt: new Date(now.getTime() + 900000),
      requestHash: 'a'.repeat(64),
    },
    10,
    now,
  )
  adapter.submit
    .mockRejectedValueOnce({status: 429})
    .mockResolvedValueOnce({...response, outputText: '', status: 'queued', tokenCount: null})
  const secondary = {...provider, id: 'secondary', poolId: 'independent'}
  await createApiAiService({
    adapter,
    clock: () => now,
    createAttemptId: () => crypto.randomUUID(),
    deliver,
    legacyWebhook,
    providers: () => [provider, secondary],
    repository,
  }).dispatchJob(id)
  expect(adapter.submit.mock.calls.map(([selected]) => selected.id)).toEqual([
    'openai',
    'secondary',
  ])
  expect(await repository.findApiAiJob(id)).toMatchObject({status: 'running'})
  expect(adapter.retrieve).not.toHaveBeenCalled()
})
