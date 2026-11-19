/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {eq} from 'drizzle-orm'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {
  feedChannels,
  historicalGenerationRuns,
  historicalMoments,
  historicalMomentSources,
  processedOpenAiWebhookEvents,
  type TransactionalDatabase,
} from '../../../database'
import {
  failHistoryResponse,
  type GenerationRun,
  publishHistoryResponse,
  rejectHistoryResponse,
} from '..'
import {GENERATION, RESPONSE_ID, SOURCE_URLS} from './index.test-support'
import {readSchema} from './fixtures/read-schema'

vi.mock('src/env', () => ({env: {}}))

const postgres = new PGlite()
const database = drizzle(postgres, {casing: 'snake_case'})
// The injected database uses real PGlite transactions through the shared Drizzle API.
const transactionalDatabase = database as unknown as TransactionalDatabase
let channelId: string

beforeAll(async () => {
  await postgres.exec(await readSchema())
  const [channel] = await database
    .insert(feedChannels)
    .values({description: 'History fixture', language: 'ko', slug: 'history', title: 'History'})
    .returning({id: feedChannels.id})
  channelId = channel.id
})

afterEach(async () => {
  await postgres.exec(`
    DROP TRIGGER IF EXISTS history_source_failure ON historical_moment_sources;
    DROP FUNCTION IF EXISTS history_source_failure();
    TRUNCATE historical_generation_runs, historical_moments, processed_openai_webhook_events CASCADE;
  `)
})

afterAll(async () => {
  await postgres.close()
})

const createRun = async (status: GenerationRun['status'] = 'submitted') => {
  const [run] = await database
    .insert(historicalGenerationRuns)
    .values({
      channelId,
      openAiResponseId: RESPONSE_ID,
      promptVersion: 'prompt-v1',
      sourcePolicyVersion: 'sources-v1',
      status,
      targetDate: '2026-08-16',
    })
    .returning({id: historicalGenerationRuns.id})
  return run.id
}

const publish = (eventId: string, replaceDate = false) =>
  publishHistoryResponse(
    {
      eventId,
      generation: GENERATION,
      model: 'fixture-model',
      replaceDate,
      responseId: RESPONSE_ID,
      searchSourceUrls: SOURCE_URLS,
    },
    transactionalDatabase,
  )

it.each([
  {finish: failHistoryResponse, status: 'failed'},
  {finish: rejectHistoryResponse, status: 'rejected'},
] as const)(
  'should commit a $status response and its claimed event together',
  async ({finish, status}) => {
    const id = await createRun()
    await expect(
      finish('evt-terminal', RESPONSE_ID, 'terminal', transactionalDatabase),
    ).resolves.toBe(true)
    const [run] = await database.select().from(historicalGenerationRuns)
    expect(run).toMatchObject({errorMessage: 'terminal', id, status})
    expect(await database.select().from(processedOpenAiWebhookEvents)).toHaveLength(1)
    expect(await database.select().from(historicalMoments)).toHaveLength(0)
  },
)

it('should ignore a duplicate event without publishing a terminal run', async () => {
  await createRun()
  await expect(
    failHistoryResponse('evt-duplicate', RESPONSE_ID, 'terminal', transactionalDatabase),
  ).resolves.toBe(true)
  await expect(publish('evt-duplicate')).resolves.toBe(false)
  expect(await database.select().from(processedOpenAiWebhookEvents)).toHaveLength(1)
  expect(await database.select().from(historicalMoments)).toHaveLength(0)
})

it.each(['preparing', 'completed', 'failed', 'rejected'] as const)(
  'should commit the ignored event while leaving a %s run unchanged',
  async (status) => {
    const id = await createRun(status)
    await expect(
      rejectHistoryResponse('evt-inactive', RESPONSE_ID, 'ignored', transactionalDatabase),
    ).resolves.toBe(false)
    const [run] = await database.select().from(historicalGenerationRuns)
    expect(run).toMatchObject({errorMessage: null, id, status})
    expect(await database.select().from(processedOpenAiWebhookEvents)).toHaveLength(1)
  },
)

it('should roll back a missing-run claim and accept the same event after the run appears', async () => {
  await expect(
    failHistoryResponse('evt-retry', RESPONSE_ID, 'missing', transactionalDatabase),
  ).rejects.toThrow(`Generation run not found for response: ${RESPONSE_ID}`)
  expect(await database.select().from(processedOpenAiWebhookEvents)).toHaveLength(0)
  const id = await createRun()
  await expect(publish('evt-retry')).resolves.toBe(true)
  const [run] = await database.select().from(historicalGenerationRuns)
  expect(run).toMatchObject({id, status: 'completed'})
  const moments = await database.select().from(historicalMoments)
  expect(moments).toHaveLength(3)
  for (const moment of moments) {
    expect(moment.publishedAt).toEqual(run.completedAt)
  }
  expect(await database.select().from(historicalMomentSources)).toHaveLength(6)
  expect(await database.select().from(processedOpenAiWebhookEvents)).toHaveLength(1)
})

it('should roll back replacement and publication when source storage fails, then retry the event', async () => {
  await createRun()
  const [old] = await database
    .insert(historicalMoments)
    .values({
      channelId,
      contentHtml: 'Old content',
      eventDay: 16,
      eventMonth: 8,
      eventYear: 1800,
      historicalEra: 'ce',
      stableKey: 'previous',
      status: 'published',
      summary: 'Old summary',
      title: 'Old title',
    })
    .returning({id: historicalMoments.id})
  await postgres.exec(`
    CREATE FUNCTION history_source_failure() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN RAISE EXCEPTION 'forced source storage failure'; END $$;
    CREATE TRIGGER history_source_failure BEFORE INSERT ON historical_moment_sources
    FOR EACH ROW EXECUTE FUNCTION history_source_failure();
  `)

  const [result] = await Promise.allSettled([publish('evt-publication', true)])
  expect(result.status).toBe('rejected')
  if (result.status === 'rejected') {
    expect(result.reason).toMatchObject({cause: {code: 'P0001'}})
  }
  expect(await database.select().from(processedOpenAiWebhookEvents)).toHaveLength(0)
  expect(await database.select().from(historicalMoments)).toMatchObject([
    {id: old.id, status: 'published'},
  ])
  expect(await database.select().from(historicalMomentSources)).toHaveLength(0)
  expect(await database.select().from(historicalGenerationRuns)).toMatchObject([
    {status: 'submitted'},
  ])

  await postgres.exec(`
    DROP TRIGGER history_source_failure ON historical_moment_sources;
    DROP FUNCTION history_source_failure();
  `)
  await expect(publish('evt-publication', true)).resolves.toBe(true)
  expect(
    await database.select().from(historicalMoments).where(eq(historicalMoments.id, old.id)),
  ).toMatchObject([{status: 'archived'}])
  expect(
    await database
      .select()
      .from(historicalMoments)
      .where(eq(historicalMoments.status, 'published')),
  ).toHaveLength(3)
  expect(await database.select().from(processedOpenAiWebhookEvents)).toHaveLength(1)
})
