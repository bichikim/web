/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import * as repository from 'src/server/repositories/api-ai'
import {createApiAiQueue} from '../queue'
import {getApiAiProviders, getConfiguredApiAiProviders} from '../providers'
import {createOpenRouterAdapter} from '../create-openrouter-adapter'
import type {ApiAiJob, ApiAiProvider} from '../types'

vi.mock('src/server/repositories/api-ai', () => ({
  claimApiAiJob: vi.fn(),
  findApiAiJob: vi.fn(),
  resolveApiAiJobProviders: vi.fn(),
}))
vi.mock('../queue', () => ({createApiAiQueue: vi.fn()}))
vi.mock('../providers', () => ({
  getApiAiProviders: vi.fn(),
  getConfiguredApiAiProviders: vi.fn(),
}))
vi.mock('../create-openrouter-adapter', () => ({createOpenRouterAdapter: vi.fn()}))
vi.mock('../deliver-api-ai-job', () => ({deliverApiAiJob: vi.fn()}))
vi.mock('../responses-adapter', () => ({
  responsesAdapter: {cancel: vi.fn(), retrieve: vi.fn(), submit: vi.fn()},
}))

const enqueue = vi.fn()
const provider: ApiAiProvider = {
  apiKey: 'key',
  baseUrl: 'https://api.example/v1',
  id: 'openai',
  models: {'cloud-text': 'text-model'},
  poolId: 'primary',
  protocol: 'openai-responses-background',
  webhookSecret: 'secret',
}
const job: ApiAiJob = {
  activeAttemptId: null,
  body: {},
  cancelRequestedAt: null,
  id: 'job-1',
  kind: 'cloud-text',
  ownerId: 'owner',
  result: null,
  status: 'queued',
}

beforeEach(() => {
  vi.resetModules()
  vi.mocked(createApiAiQueue).mockReturnValue(enqueue)
  vi.mocked(createOpenRouterAdapter).mockReturnValue({submit: vi.fn()})
  vi.mocked(getConfiguredApiAiProviders).mockReturnValue([provider])
  vi.mocked(getApiAiProviders).mockReturnValue([provider])
  vi.mocked(repository.findApiAiJob).mockResolvedValue(job)
  vi.mocked(repository.resolveApiAiJobProviders).mockResolvedValue([provider])
  vi.mocked(repository.claimApiAiJob).mockResolvedValue(null)
})
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
})

it.each([
  {deploymentId: 'deployment', environment: 'preview', nodeEnvironment: 'production'},
  {deploymentId: undefined, environment: undefined, nodeEnvironment: 'development'},
])(
  'should queue cloud text without relying on a webhook in $environment/$nodeEnvironment',
  async ({deploymentId, environment, nodeEnvironment}) => {
    vi.stubEnv('NODE_ENV', nodeEnvironment)
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', deploymentId)
    vi.stubEnv('VERCEL_ENV', environment)
    const {dispatchApiAiJob} = await import('../service')
    await dispatchApiAiJob(job.id)
    expect(enqueue).toHaveBeenCalledExactlyOnceWith(job.id)
    expect(repository.claimApiAiJob).not.toHaveBeenCalled()
  },
)

it.each([
  {deploymentId: 'deployment', environment: 'production', nodeEnvironment: 'production'},
  {deploymentId: undefined, environment: undefined, nodeEnvironment: 'production'},
])(
  'should preserve direct background dispatch in $environment/$nodeEnvironment',
  async ({deploymentId, environment, nodeEnvironment}) => {
    vi.stubEnv('NODE_ENV', nodeEnvironment)
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', deploymentId)
    vi.stubEnv('VERCEL_ENV', environment)
    const {dispatchApiAiJob} = await import('../service')
    await dispatchApiAiJob(job.id)
    expect(enqueue).not.toHaveBeenCalled()
    expect(repository.claimApiAiJob).toHaveBeenCalledWith(
      job.id,
      [provider],
      expect.any(Date),
      expect.any(String),
    )
  },
)
