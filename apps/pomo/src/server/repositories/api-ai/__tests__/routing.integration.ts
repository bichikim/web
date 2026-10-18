/** @vitest-environment node */
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {apiAiJobs, getDatabase, withTransactionalDatabase} from 'src/server/database'
import {prepareApiAiQueue} from 'src/server/cloud-text/__tests__/fixtures/api-ai-queue'
import type {ApiAiProvider} from 'src/server/api-ai/types'
import {classifyApiAiSubmissionError} from 'src/server/api-ai/submission-error'
import {claimApiAiJob, createApiAiJob, recordApiAiSubmissionError} from '..'
import {
  readAdminApiAiPage,
  resolveApiAiJobProviders,
  updateApiAiCatalog,
  updateApiAiRouting,
} from '../routing'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema/api-ai')),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))
const database = new PGlite()
const client = drizzle(database, {casing: 'snake_case'})
const now = new Date('2026-10-08T00:00:00Z')
const provider: ApiAiProvider = {
  apiKey: 'private-key',
  baseUrl: 'https://api.openai.com/v1',
  id: 'openai',
  models: {'cloud-text': 'primary', history: 'history'},
  poolId: 'openai',
  webhookSecret: 'private-webhook',
}
const router: ApiAiProvider = {
  ...provider,
  id: 'openrouter',
  models: {'cloud-text': 'gemma:free'},
  poolId: 'router',
  protocol: 'openrouter-responses-queue',
}
const providers = [provider, router]
const update = {
  revision: 0,
  routes: [{model: 'gemma:free', providerId: 'openrouter'}],
}
const enqueue = async (kind: 'cloud-text' | 'history' = 'cloud-text') => {
  const id = crypto.randomUUID()
  await createApiAiJob(
    {
      body: {max_output_tokens: 100},
      generationMilliseconds: 120000,
      id,

      kind,
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
afterEach(async () => database.exec('truncate api_ai_jobs, api_ai_routing, api_ai_pools cascade'))
afterAll(async () => database.close())

it('should keep environment defaults before a save and expose no provider credentials', async () => {
  const page = await readAdminApiAiPage(providers, [provider])
  expect(page).toMatchObject({
    revision: 0,
    routes: [{model: 'primary', providerId: 'openai'}],
    source: 'environment',
  })
  expect(JSON.stringify(page)).not.toContain('private-key')
  expect(JSON.stringify(page)).not.toContain('private-webhook')
  const history = await resolveApiAiJobProviders(await enqueue('history'), providers, [provider])
  expect(history[0].models.history).toBe('history')
})
it('should permit only one concurrent administrator to replace the same revision', async () => {
  expect(
    await Promise.all([
      updateApiAiRouting(update, providers, now),
      updateApiAiRouting(update, providers, now),
    ]),
  ).toEqual(['saved', 'conflict'])
  expect(await updateApiAiRouting({...update, revision: 1}, providers, now)).toBe('saved')
  expect(await updateApiAiRouting({...update, revision: 1}, providers, now)).toBe('conflict')
  expect((await readAdminApiAiPage(providers, [provider])).revision).toBe(2)
})
it('should freeze a job order across instances while new jobs use the next saved order', async () => {
  await updateApiAiRouting(update, providers, now)
  const first = await enqueue()
  expect(
    (await resolveApiAiJobProviders(first, providers, [provider])).map((item) => item.id),
  ).toEqual(['openrouter'])
  await updateApiAiRouting(
    {...update, revision: 1, routes: [{model: 'replacement', providerId: 'openai'}]},
    providers,
    now,
  )
  expect(
    (await resolveApiAiJobProviders(first, providers, [provider]))[0].models['cloud-text'],
  ).toBe('gemma:free')
  expect(
    (await resolveApiAiJobProviders(await enqueue(), providers, [provider]))[0].models[
      'cloud-text'
    ],
  ).toBe('replacement')
  expect((await client.select().from(apiAiJobs))[0].body).toEqual({max_output_tokens: 100})
})
it('should try a different model on the same provider after a definite rejection', async () => {
  const id = await enqueue()
  const ordered = [provider, {...provider, models: {'cloud-text': 'fallback'}}]
  const first = await claimApiAiJob(id, ordered, now, crypto.randomUUID())
  if (first === null) {
    throw new Error('Expected primary attempt')
  }
  await recordApiAiSubmissionError(
    first.attempt.id,
    classifyApiAiSubmissionError({code: 'model_not_found', status: 404}, now.getTime()),
    now,
  )
  expect((await claimApiAiJob(id, ordered, now, crypto.randomUUID()))?.attempt.modelId).toBe(
    'fallback',
  )
})
it('should accept paid fallback and share the saved order across cloud jobs', async () => {
  const routes = [...update.routes, {model: 'primary', providerId: 'openai'}]
  expect(await updateApiAiRouting({...update, routes}, providers, now)).toBe('saved')
  expect((await readAdminApiAiPage(providers, [provider])).routes).toEqual(routes)
  expect(
    (await resolveApiAiJobProviders(await enqueue(), providers, [provider])).map((item) => item.id),
  ).toEqual(['openrouter', 'openai'])
  const history = await resolveApiAiJobProviders(await enqueue('history'), providers, [provider])
  expect(history.map((item) => item.id)).toEqual(['openai'])
  expect(history[0].models.history).toBe('primary')
})
it('should retain legacy saved routes while ignoring the removed paid-fallback gate', async () => {
  const routes = [...update.routes, {model: 'primary', providerId: 'openai'}]
  await database.query('insert into api_ai_routing (kind, revision, routing) values ($1, $2, $3)', [
    'cloud-text',
    2,
    JSON.stringify({allowPaidFallback: false, routes}),
  ])
  const page = await readAdminApiAiPage(providers, [provider])
  expect(page).toMatchObject({revision: 2, routes})
  expect(page).not.toHaveProperty('allowPaidFallback')
  expect(
    (await resolveApiAiJobProviders(await enqueue(), providers, [provider])).map((item) => item.id),
  ).toEqual(['openrouter', 'openai'])
})
it('should reject an unconfigured provider without changing the saved order', async () => {
  expect(
    await updateApiAiRouting(
      {...update, routes: [{model: 'unknown', providerId: 'missing'}]},
      providers,
      now,
    ),
  ).toBe('invalid')
  expect((await readAdminApiAiPage(providers, [provider])).revision).toBe(0)
})
it('should fail a job with no compatible route instead of keeping it pending', async () => {
  await updateApiAiRouting(update, providers, now)
  const id = await enqueue('history')
  const resolved = await resolveApiAiJobProviders(id, providers, [provider])
  expect(resolved).toEqual([])
  expect(await claimApiAiJob(id, resolved, now, crypto.randomUUID())).toBeNull()
  expect((await client.select().from(apiAiJobs))[0].status).toBe('failed')
})

it('should register provider models without changing priority and retain them on order saves', async () => {
  await updateApiAiRouting(update, providers, now)
  const entry = {label: 'Another', model: 'another:free', providerId: 'openrouter'}
  expect(
    await updateApiAiCatalog(
      {entry, operation: 'register', revision: 1},
      providers,
      [provider],
      now,
    ),
  ).toBe('saved')
  const page = await readAdminApiAiPage(providers, [provider])
  expect(page.routes).toEqual(update.routes)
  expect(page.catalog).toContainEqual({...entry, removable: true})
  expect(
    await updateApiAiCatalog(
      {entry, operation: 'register', revision: 1},
      providers,
      [provider],
      now,
    ),
  ).toBe('conflict')
  expect(await updateApiAiRouting({...update, revision: 2}, providers, now)).toBe('saved')
  expect((await readAdminApiAiPage(providers, [provider])).catalog).toContainEqual({
    ...entry,
    removable: true,
  })
  expect(
    await updateApiAiCatalog({entry, operation: 'remove', revision: 3}, providers, [provider], now),
  ).toBe('saved')
  expect(
    (await readAdminApiAiPage(providers, [provider])).catalog.some(
      (item) => item.model === entry.model,
    ),
  ).toBe(false)
})
it('should preserve configured and selected models while rejecting duplicates and missing providers', async () => {
  const entry = {label: '', model: 'gemma:free', providerId: 'openrouter'}
  expect(
    await updateApiAiCatalog({entry, operation: 'remove', revision: 0}, providers, [provider], now),
  ).toBe('invalid')
  expect(
    await updateApiAiCatalog(
      {entry, operation: 'register', revision: 0},
      providers,
      [provider],
      now,
    ),
  ).toBe('invalid')
  expect(
    await updateApiAiCatalog(
      {entry: {...entry, providerId: 'missing'}, operation: 'register', revision: 0},
      providers,
      [provider],
      now,
    ),
  ).toBe('invalid')
  expect((await readAdminApiAiPage(providers, [provider])).revision).toBe(0)
})
