/** @vitest-environment node */
// oxlint-disable no-await-in-loop -- Each fallback requires the previous rejection to be recorded first.
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {eq} from 'drizzle-orm'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {
  apiAiAttempts,
  apiAiJobs,
  apiAiPools,
  getDatabase,
  withTransactionalDatabase,
} from 'src/server/database'
import {prepareApiAiQueue} from 'src/server/cloud-text/__tests__/fixtures/api-ai-queue'
import type {ApiAiProvider, ApiAiResponse} from 'src/server/api-ai/types'
import {classifyApiAiSubmissionError} from 'src/server/api-ai/submission-error'
import {
  claimApiAiAttemptRecovery,
  claimApiAiJob,
  createApiAiJob,
  expireQueuedApiAiJobs,
  findApiAiJob,
  listQueuedApiAiJobs,
  recordApiAiResponse,
  recordApiAiSubmissionError,
} from '..'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema/api-ai')),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))
const database = new PGlite()
const client = drizzle(database, {casing: 'snake_case'})
const now = new Date('2026-10-08T00:00:00Z')
const provider: ApiAiProvider = {
  apiKey: 'key',
  baseUrl: 'https://api.example/v1',
  id: 'primary',
  models: {'cloud-text': 'model', history: 'history-model'},
  poolId: 'shared',
  webhookSecret: 'secret',
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
const enqueue = async () => {
  const id = crypto.randomUUID()
  await createApiAiJob(
    {
      body: {input: 'hello', max_output_tokens: 100},
      generationMilliseconds: 120000,
      id,
      kind: 'cloud-text',
      ownerId: null,
      queueExpiresAt: new Date(now.getTime() + 900000),
      requestHash: 'a'.repeat(64),
    },
    100,
    now,
  )
  return id
}
beforeAll(async () => {
  await database.exec(
    'create table pomo_users (id uuid primary key); create table cloud_text_requests (id uuid primary key)',
  )
  await prepareApiAiQueue(database)
  vi.mocked(getDatabase).mockReturnValue(client as unknown as ReturnType<typeof getDatabase>)
  vi.mocked(withTransactionalDatabase).mockImplementation(async (operation) =>
    operation(client as unknown as Parameters<typeof operation>[0]),
  )
})
afterEach(async () => {
  await database.exec('truncate api_ai_jobs, api_ai_attempts, api_ai_pools cascade')
})
afterAll(async () => {
  await database.close()
})

it('should let the API decide availability despite a legacy disabled or cooling pool', async () => {
  await client.insert(apiAiPools).values({
    blockedUntil: new Date(now.getTime() + 90000),
    disabled: 'previous rejection',
    id: provider.poolId,
  })
  expect(
    (await claimApiAiJob(await enqueue(), [provider], now, crypto.randomUUID()))?.provider.id,
  ).toBe('primary')
})

it('should claim each job once while allowing different jobs to run concurrently', async () => {
  const ids = await Promise.all([enqueue(), enqueue(), enqueue()])
  const claims = await Promise.all(
    ids.flatMap((id) => [
      claimApiAiJob(id, [provider], now, crypto.randomUUID()),
      claimApiAiJob(id, [provider], now, crypto.randomUUID()),
    ]),
  )
  expect(claims.filter((claim) => claim !== null)).toHaveLength(3)
  expect(await client.select().from(apiAiAttempts)).toHaveLength(3)
  expect(
    (await client.select().from(apiAiJobs)).filter((job) => job.status === 'queued'),
  ).toHaveLength(0)
  expect(
    (await client.select().from(apiAiJobs)).every(
      (job) => job.createdAt.getTime() === now.getTime(),
    ),
  ).toBe(true)
})
it('should allow concurrent models and API keys in the same pool', async () => {
  const first = await enqueue()
  const second = await enqueue()
  expect(await claimApiAiJob(first, [provider], now, crypto.randomUUID())).not.toBeNull()
  expect(
    await claimApiAiJob(
      second,
      [{...provider, id: 'another-key', models: {'cloud-text': 'another-model'}}],
      now,
      crypto.randomUUID(),
    ),
  ).not.toBeNull()
})
it('should keep the first model despite other active requests', async () => {
  await claimApiAiJob(await enqueue(), [provider], now, crypto.randomUUID())
  const claim = await claimApiAiJob(
    await enqueue(),
    [provider, {...provider, id: 'secondary', poolId: 'independent'}],
    now,
    crypto.randomUUID(),
  )
  expect(claim?.provider.id).toBe('primary')
})
it('should release capacity on completion and reject a stale queued response', async () => {
  const id = await enqueue()
  const claim = await claimApiAiJob(id, [provider], now, crypto.randomUUID())
  if (claim === null) {
    throw new Error('Expected claim')
  }
  await recordApiAiResponse(claim.attempt.id, response, now)
  await recordApiAiResponse(claim.attempt.id, {...response, status: 'in_progress'}, now)
  expect(await findApiAiJob(id)).toMatchObject({
    result: {outputText: 'complete'},
    status: 'succeeded',
  })
  expect(await claimApiAiJob(await enqueue(), [provider], now, crypto.randomUUID())).not.toBeNull()
})
it('should switch models on actual rate-limit rejection without a duplicate active attempt', async () => {
  const id = await enqueue()
  const first = await claimApiAiJob(id, [provider], now, crypto.randomUUID())
  if (first === null) {
    throw new Error('Expected claim')
  }
  await recordApiAiSubmissionError(
    first.attempt.id,
    classifyApiAiSubmissionError(
      {headers: new Headers({'Retry-After': '90'}), status: 429},
      now.getTime(),
    ),
    now,
  )
  const second = await claimApiAiJob(
    id,
    [provider, {...provider, id: 'secondary', poolId: 'independent'}],
    now,
    crypto.randomUUID(),
  )
  expect(second?.provider.id).toBe('secondary')
  await recordApiAiResponse(first.attempt.id, response, now)
  expect(await findApiAiJob(id)).toMatchObject({
    activeAttemptId: second?.attempt.id,
    status: 'submitting',
  })
})
it('should avoid duplicate ambiguous submissions without blocking other jobs', async () => {
  const id = await enqueue()
  const claim = await claimApiAiJob(id, [provider], now, crypto.randomUUID())
  if (claim === null) {
    throw new Error('Expected claim')
  }
  await recordApiAiSubmissionError(
    claim.attempt.id,
    classifyApiAiSubmissionError(new Error('network'), now.getTime()),
    now,
  )
  expect(
    await claimApiAiJob(
      id,
      [provider, {...provider, id: 'secondary', poolId: 'independent'}],
      now,
      crypto.randomUUID(),
    ),
  ).toBeNull()
  expect(await claimApiAiJob(await enqueue(), [provider], now, crypto.randomUUID())).not.toBeNull()
})
it('should ignore legacy minute, daily and token budgets after completed requests', async () => {
  const limited = {...provider, requestsPerDay: 1, requestsPerMinute: 1, tokensPerMinute: 1}
  const claim = await claimApiAiJob(await enqueue(), [limited], now, crypto.randomUUID())
  if (claim === null) {
    throw new Error('Expected claim')
  }
  await recordApiAiResponse(claim.attempt.id, response, now)
  expect(await claimApiAiJob(await enqueue(), [limited], now, crypto.randomUUID())).not.toBeNull()
})
it('should fail after all models reject without retrying previously rejected models', async () => {
  const id = await enqueue()
  const providers = [provider, {...provider, id: 'secondary', poolId: 'independent'}]
  for (const selected of providers) {
    const claim = await claimApiAiJob(id, providers, now, crypto.randomUUID())
    expect(claim?.provider.id).toBe(selected.id)
    if (claim === null) {
      throw new Error('Expected claim')
    }
    await recordApiAiSubmissionError(
      claim.attempt.id,
      classifyApiAiSubmissionError({status: 429}, now.getTime()),
      now,
    )
  }
  expect(
    await claimApiAiJob(id, providers, new Date(now.getTime() + 61000), crypto.randomUUID()),
  ).toBeNull()
  expect(await findApiAiJob(id)).toMatchObject({status: 'failed'})
  expect(await client.select().from(apiAiAttempts)).toHaveLength(2)
})
it('should refund cancellation semantics without reopening a job when the provider reports completion', async () => {
  const id = await enqueue()
  const claim = await claimApiAiJob(id, [provider], now, crypto.randomUUID())
  if (claim === null) {
    throw new Error('Expected claim')
  }
  await client.update(apiAiJobs).set({cancelRequestedAt: now}).where(eq(apiAiJobs.id, id))
  await recordApiAiResponse(claim.attempt.id, response, now)
  expect(await findApiAiJob(id)).toMatchObject({status: 'cancelled'})
})
it('should reject queue admission without an extra persisted job', async () => {
  const id = await enqueue()
  const input = {
    body: {max_output_tokens: 100},
    generationMilliseconds: 120000,
    id: crypto.randomUUID(),
    kind: 'history' as const,
    ownerId: null,
    queueExpiresAt: now,
    requestHash: 'b'.repeat(64),
  }
  expect(await createApiAiJob(input, 1, now)).toEqual({kind: 'full'})
  expect((await client.select().from(apiAiJobs)).map((job) => job.id)).toEqual([id])
})

it('should grant one recovery check across concurrent invocations and defer its next check', async () => {
  const claim = await claimApiAiJob(await enqueue(), [provider], now, crypto.randomUUID())
  if (claim === null) {
    throw new Error('Expected claim')
  }
  const grants = await Promise.all([
    claimApiAiAttemptRecovery(claim.attempt.id, now),
    claimApiAiAttemptRecovery(claim.attempt.id, now),
  ])
  expect(grants.filter(Boolean)).toHaveLength(1)
  expect(await claimApiAiAttemptRecovery(claim.attempt.id, new Date(now.getTime() + 61000))).toBe(
    true,
  )
})

it('should expire old queued jobs before selecting the next dispatch batch', async () => {
  const id = await enqueue()
  await expireQueuedApiAiJobs(new Date(now.getTime() + 900001))
  expect(await listQueuedApiAiJobs(new Date(now.getTime() + 900001))).toEqual([])
  expect(await findApiAiJob(id)).toMatchObject({status: 'failed'})
})
