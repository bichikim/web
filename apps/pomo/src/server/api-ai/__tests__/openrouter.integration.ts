/** @vitest-environment node */
// oxlint-disable no-await-in-loop -- Database migrations must run in their declared order.
// oxlint-disable eslint-js/camelcase -- Fixtures exercise the Responses wire contract.
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {eq} from 'drizzle-orm'
import {readFile} from 'node:fs/promises'
import {afterAll, afterEach, beforeAll, beforeEach, expect, it, vi} from 'vitest'
import {apiAiAttempts, apiAiJobs, getDatabase, withTransactionalDatabase} from 'src/server/database'
import * as repository from 'src/server/repositories/api-ai'
import {readCloudTextUsage, reserveCloudText} from 'src/server/cloud-text/quota'
import {readCloudTextJob} from 'src/server/cloud-text/job-status'
import {prepareApiAiQueue} from 'src/server/cloud-text/__tests__/fixtures/api-ai-queue'
import {prepareProductLimits} from 'src/server/cloud-text/__tests__/fixtures/product-limits'
import {createApiAiService} from '../create-api-ai-service'
import {deliverApiAiJob} from '../deliver-api-ai-job'
import {createOpenRouterAdapter} from '../create-openrouter-adapter'
import type {ApiAiProvider} from '../types'

vi.mock('src/server/database', async () => ({
  ...(await vi.importActual('src/server/database/schema')),
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))
const database = new PGlite()
const client = drizzle(database, {casing: 'snake_case'})
const now = new Date()
const userId = '00000000-0000-4000-8000-000000000001'
const provider: ApiAiProvider = {
  apiKey: 'key',
  baseUrl: 'https://openrouter.ai/api/v1',
  id: 'openrouter',
  models: {'cloud-text': 'google/gemma-4-26b-a4b-it:free'},
  poolId: 'router',
  protocol: 'openrouter-responses-queue',
}
const response = {
  id: 'resp_router',
  model: 'google/gemma-4-26b-a4b-it:free',
  output: [{content: [{text: '새로운 시작을 준비하세요.', type: 'output_text'}], type: 'message'}],
  status: 'completed',
  usage: {input_tokens: 10, output_tokens: 20, total_tokens: 30},
}
const background = {cancel: vi.fn(), retrieve: vi.fn(), submit: vi.fn()}
const enqueue = vi.fn()
const fetch = vi.fn<typeof globalThis.fetch>()
const createService = (
  clock = () => now,
  providers: ReadonlyArray<ApiAiProvider> = [provider],
  monitorBackground = false,
) =>
  createApiAiService({
    adapter: background,
    clock,
    createAttemptId: () => crypto.randomUUID(),
    deliver: deliverApiAiJob,
    legacyWebhook: vi.fn(),
    providers: () => providers,
    queue: {adapter: createOpenRouterAdapter({fetch}), enqueue, monitorBackground},
    repository,
  })
const reserve = async () => {
  const id = crypto.randomUUID()
  await reserveCloudText({
    now,
    queue: {
      input: {
        body: {
          input: [{content: '이직할까요? 바보, 마법사, 별 정방향', role: 'user'}],
          max_output_tokens: 100,
        },
        generationMilliseconds: 120000,
        id,
        kind: 'cloud-text',
        ownerId: userId,
        queueExpiresAt: new Date(now.getTime() + 900000),
        requestHash: 'a'.repeat(64),
      },
      limit: 100,
    },
    requestHash: 'a'.repeat(64),
    requestId: id,
    userId,
  })
  return id
}
beforeAll(async () => {
  await database.exec('create table pomo_users (id uuid primary key, deleted_at timestamptz)')
  for (const name of ['0023_cloud_text', '0024_cloud_text_limits', '0025_cloud_text_usage_reset']) {
    await database.exec(
      await readFile(new URL(`../../../../drizzle/${name}.sql`, import.meta.url), 'utf8'),
    )
  }
  await prepareProductLimits(database)
  await prepareApiAiQueue(database)
  await database.query('insert into pomo_users values ($1)', [userId])
  vi.mocked(getDatabase).mockReturnValue(client as unknown as ReturnType<typeof getDatabase>)
  vi.mocked(withTransactionalDatabase).mockImplementation(async (operation) =>
    operation(client as unknown as Parameters<typeof operation>[0]),
  )
})
beforeEach(() => {
  vi.mocked(getDatabase).mockReturnValue(client as unknown as ReturnType<typeof getDatabase>)
  vi.mocked(withTransactionalDatabase).mockImplementation(async (operation) =>
    operation(client as unknown as Parameters<typeof operation>[0]),
  )
  fetch.mockResolvedValue(Response.json(response))
})
afterEach(async () => {
  vi.resetAllMocks()
  await database.exec(
    `truncate cloud_text_requests, api_ai_jobs, api_ai_attempts, api_ai_pools,
    api_ai_routing, api_ai_callbacks cascade`,
  )
})
afterAll(() => database.close())

it('should generate and settle one Korean result across two instances and repeated queue deliveries', async () => {
  const id = await reserve()
  const first = createService()
  const second = createService()
  await first.dispatch()
  expect(enqueue).toHaveBeenCalledWith(id)
  expect(await client.select().from(apiAiAttempts)).toHaveLength(0)
  await Promise.all([first.executeQueuedJob(id), second.executeQueuedJob(id)])
  await second.executeQueuedJob(id)
  expect(fetch).toHaveBeenCalledOnce()
  expect(background.submit).not.toHaveBeenCalled()
  expect(await client.select().from(apiAiAttempts)).toMatchObject([
    {billedTokens: 30, state: 'succeeded'},
  ])
  expect(await readCloudTextJob(userId, id)).toMatchObject({
    kind: 'complete',
    text: '새로운 시작을 준비하세요.',
    tokenCount: 30,
    usage: {used: 1},
  })
})

it('should refund a confirmed provider failure exactly once without switching to OpenAI', async () => {
  fetch.mockResolvedValue(Response.json({error: {message: 'bad request'}}, {status: 400}))

  const id = await reserve()
  await createService().executeQueuedJob(id)
  await createService().executeQueuedJob(id)
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'failed', usage: {used: 0}})
  expect(fetch).toHaveBeenCalledOnce()
  expect(background.submit).not.toHaveBeenCalled()
})

it('should skip a cancelled queue message and return its allowance', async () => {
  const id = await reserve()
  await repository.cancelQueuedApiAiJob(id, userId, now)
  await createService().executeQueuedJob(id)
  expect(fetch).not.toHaveBeenCalled()
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'cancelled', usage: {used: 0}})
})

it('should send each new job to the API and refund confirmed authentication failures', async () => {
  fetch.mockResolvedValue(Response.json({error: {message: 'Invalid API key'}}, {status: 401}))

  const first = await reserve()
  await createService().executeQueuedJob(first)
  const second = await reserve()
  await createService().executeQueuedJob(second)
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(await readCloudTextJob(userId, first)).toMatchObject({kind: 'failed', usage: {used: 0}})
  expect(await readCloudTextJob(userId, second)).toMatchObject({kind: 'failed', usage: {used: 0}})
})

it('should fail and refund a sole model after an actual API rate-limit rejection', async () => {
  fetch.mockResolvedValue(Response.json({error: {message: 'limited'}}, {status: 429}))

  const id = await reserve()
  const service = createService()
  await service.executeQueuedJob(id)
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'failed', usage: {used: 0}})
  await service.executeQueuedJob(id)
  expect(fetch).toHaveBeenCalledOnce()
})

it('should expire an unprocessed queue job and refund it without an API request', async () => {
  const id = await reserve()
  await createService(() => new Date(now.getTime() + 900001)).dispatch()
  expect(fetch).not.toHaveBeenCalled()
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'failed', usage: {used: 0}})
})

it('should not replay an ambiguous submission and refund it after its deadline', async () => {
  fetch.mockRejectedValue(new Error('connection lost'))
  const id = await reserve()
  await createService().executeQueuedJob(id)
  await createService().executeQueuedJob(id)
  expect(fetch).toHaveBeenCalledOnce()
  expect(await repository.findApiAiJob(id)).toMatchObject({status: 'recovery_pending'})
  await createService(() => new Date(now.getTime() + 120001)).recover()
  expect(await readCloudTextUsage(userId, now)).toMatchObject({used: 0})
  expect(await client.select().from(apiAiAttempts)).toMatchObject([{state: 'unknown'}])
})

it('should preserve cancellation when the provider finishes later', async () => {
  const id = await reserve()
  fetch.mockImplementation(async () => {
    await client.update(apiAiJobs).set({cancelRequestedAt: now}).where(eq(apiAiJobs.id, id))
    return Response.json(response)
  })

  await createService().executeQueuedJob(id)
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'cancelled', usage: {used: 0}})
})

const openai: ApiAiProvider = {
  apiKey: 'openai-key',
  baseUrl: 'https://api.openai.com/v1',
  id: 'openai',
  models: {'cloud-text': 'gpt-6-luna'},
  poolId: 'openai',
  protocol: 'openai-responses-background',
  webhookSecret: 'secret',
}

it('should complete local OpenAI readings by redelivery without a webhook or duplicate generation', async () => {
  const service = createService(() => now, [openai], true)
  background.submit.mockResolvedValue({
    ...response,
    metadata: {},
    outputText: '',
    responseId: 'resp_local',
    status: 'queued',
    tokenCount: 0,
  })
  background.retrieve
    .mockResolvedValueOnce({
      ...response,
      metadata: {},
      outputText: '',
      responseId: 'resp_local',
      status: 'in_progress',
      tokenCount: 0,
    })
    .mockResolvedValue({
      ...response,
      metadata: {},
      outputText: '로컬 해석 완료',
      responseId: 'resp_local',
      status: 'completed',
      tokenCount: 30,
    })
  const id = await reserve()
  await service.dispatchJob(id)
  expect(enqueue).toHaveBeenCalledWith(id)
  expect(background.submit).not.toHaveBeenCalled()
  await expect(service.executeQueuedJob(id)).rejects.toThrow('waiting')
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'pending'})
  await service.executeQueuedJob(id)
  await service.executeQueuedJob(id)
  expect(background.submit).toHaveBeenCalledOnce()
  expect(background.retrieve).toHaveBeenCalledTimes(2)
  expect(fetch).not.toHaveBeenCalled()
  expect(await readCloudTextJob(userId, id)).toMatchObject({
    kind: 'complete',
    text: '로컬 해석 완료',
    usage: {used: 1},
  })
})

it('should refund an ambiguous local submission after its deadline without another generation', async () => {
  background.submit.mockRejectedValue(new Error('connection lost'))
  const id = await reserve()
  await expect(createService(() => now, [openai], true).executeQueuedJob(id)).rejects.toThrow(
    'waiting',
  )
  await createService(() => new Date(now.getTime() + 120001), [openai], true).executeQueuedJob(id)
  expect(background.submit).toHaveBeenCalledOnce()
  expect(background.retrieve).not.toHaveBeenCalled()
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'failed', usage: {used: 0}})
})

it('should cancel a local background response and refund its allowance', async () => {
  const service = createService(() => now, [openai], true)
  background.submit.mockResolvedValue({
    ...response,
    metadata: {},
    outputText: '',
    responseId: 'resp_local',
    status: 'queued',
    tokenCount: 0,
  })
  background.retrieve.mockResolvedValue({
    ...response,
    metadata: {},
    outputText: '',
    responseId: 'resp_local',
    status: 'in_progress',
    tokenCount: 0,
  })
  background.cancel.mockResolvedValue({
    ...response,
    metadata: {},
    outputText: '',
    responseId: 'resp_local',
    status: 'cancelled',
    tokenCount: 0,
  })
  const id = await reserve()
  await expect(service.executeQueuedJob(id)).rejects.toThrow('waiting')
  await client.update(apiAiJobs).set({cancelRequestedAt: now}).where(eq(apiAiJobs.id, id))
  await service.executeQueuedJob(id)
  expect(background.submit).toHaveBeenCalledOnce()
  expect(background.cancel).toHaveBeenCalledExactlyOnceWith(openai, 'resp_local')
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'cancelled', usage: {used: 0}})
})

it('should fail and refund after both models in the saved administrator order reject authentication', async () => {
  const providers = [provider, openai]
  await repository.updateApiAiRouting(
    {
      revision: 0,
      routes: [
        {model: 'gpt-6-luna', providerId: 'openai'},
        {model: 'google/gemma-4-26b-a4b-it:free', providerId: 'openrouter'},
      ],
    },
    providers,
    now,
  )
  background.submit.mockRejectedValue({status: 401})
  fetch.mockResolvedValue(Response.json({error: {message: 'Invalid API key'}}, {status: 401}))

  const id = await reserve()
  await createService(() => now, providers).executeQueuedJob(id)
  expect((await client.select().from(apiAiAttempts)).map((attempt) => attempt.providerId)).toEqual([
    'openai',
    'openrouter',
  ])
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'failed', usage: {used: 0}})
  expect(background.submit).toHaveBeenCalledOnce()
  expect(fetch).toHaveBeenCalledOnce()
})

it('should execute a saved OpenRouter to OpenAI order and settle the completion webhook once', async () => {
  const providers = [openai, provider]
  expect(
    await repository.updateApiAiRouting(
      {
        revision: 0,
        routes: [
          {model: 'google/gemma-4-26b-a4b-it:free', providerId: 'openrouter'},
          {model: 'gpt-6-luna', providerId: 'openai'},
        ],
      },
      providers,
      now,
    ),
  ).toBe('saved')
  fetch.mockResolvedValue(Response.json({error: {message: 'limited'}}, {status: 429}))

  const completed = {
    failureCode: null,
    fallback: false,
    metadata: {},
    model: 'gpt-6-luna',
    outputText: '완료',
    responseId: 'resp_openai',
    searchSourceUrls: [],
    status: 'completed' as const,
    tokenCount: 30,
  }
  background.submit.mockImplementation(async (_provider, body) => ({
    ...completed,
    metadata: body.metadata,
    status: 'queued',
  }))
  background.retrieve.mockImplementation(async () => ({
    ...completed,
    metadata: background.submit.mock.calls[0][1].metadata,
  }))
  const id = await reserve()
  await createService(() => now, providers).dispatchJob(id)
  expect(enqueue).toHaveBeenCalledWith(id)
  await createService(() => now, providers).executeQueuedJob(id)
  expect(background.submit).toHaveBeenCalledOnce()
  expect(await repository.findApiAiJob(id)).toMatchObject({status: 'running'})
  await repository.enqueueApiAiCallback(
    'openai',
    {data: {id: 'resp_openai'}, id: 'callback-one', type: 'response.completed'},
    now,
  )
  await Promise.all([
    createService(() => now, providers).complete(),
    createService(() => now, providers).complete(),
  ])
  expect(background.retrieve).toHaveBeenCalledOnce()
  expect(await readCloudTextJob(userId, id)).toMatchObject({
    kind: 'complete',
    modelId: 'gpt-6-luna',
    text: '완료',
    usage: {used: 1},
  })
  expect((await client.select().from(apiAiAttempts)).map((attempt) => attempt.providerId)).toEqual([
    'openrouter',
    'openai',
  ])
})

it('should execute a saved OpenAI to OpenRouter order and never replay an accepted request', async () => {
  const providers = [openai, provider]
  await repository.updateApiAiRouting(
    {
      revision: 0,
      routes: [
        {model: 'gpt-6-luna', providerId: 'openai'},
        {model: 'google/gemma-4-26b-a4b-it:free', providerId: 'openrouter'},
      ],
    },
    providers,
    now,
  )
  background.submit.mockRejectedValue({code: 'model_not_found', status: 404})
  const id = await reserve()
  await createService(() => now, providers).executeQueuedJob(id)
  await createService(() => now, providers).executeQueuedJob(id)
  expect(background.submit).toHaveBeenCalledOnce()
  expect(fetch).toHaveBeenCalledOnce()
  expect(await readCloudTextJob(userId, id)).toMatchObject({kind: 'complete', usage: {used: 1}})
})
