/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {readCloudTextUsage} from 'src/server/cloud-text/quota'
import {completeApiAiJobs} from 'src/server/api-ai/service'
import {waitUntil} from '@vercel/functions'
import {generateCloudText} from 'src/server/cloud-text/service'
import {invokeApiRoute} from './invoke'
import {GET, POST} from '../cloud-text'

vi.mock('src/server/auth/resolve-user-request', () => ({resolveUserRequest: vi.fn()}))
vi.mock('src/server/cloud-text/quota', () => ({readCloudTextUsage: vi.fn()}))
vi.mock('src/server/api-ai/service', () => ({
  completeApiAiJobs: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('src/server/cloud-text/job-events', () => ({streamCloudTextJob: vi.fn()}))
vi.mock('src/server/cloud-text/job-status', () => ({readCloudTextJob: vi.fn()}))
vi.mock('src/server/cloud-text/cancel-job', () => ({cancelCloudTextJob: vi.fn()}))
vi.mock('@vercel/functions', () => ({waitUntil: vi.fn()}))
vi.mock('src/server/cloud-text/service', () => ({generateCloudText: vi.fn()}))
const usage = {
  day: '2026-10-07',
  limit: 3,
  remaining: 2,
  resetsAt: '2026-10-07T15:00:00.000Z',
  used: 1,
}
const body = {
  maximumTokens: 100,
  messages: [{content: '해석해 주세요.', role: 'user'}],
  requestId: '00000000-0000-4000-8000-000000000001',
}
const request = (value: unknown = body) =>
  new Request('https://pomo.example/api/cloud-text', {body: JSON.stringify(value), method: 'POST'})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(resolveUserRequest).mockResolvedValue({
    access: 'user',
    cookies: ['session=refreshed'],
    userId: 'user-1',
  })
  vi.mocked(readCloudTextUsage).mockResolvedValue(usage)
  vi.mocked(generateCloudText).mockResolvedValue({
    kind: 'complete',
    text: '결과',
    tokenCount: 100,
    usage,
  })
})
it('should reject anonymous generation before provider or quota access', async () => {
  vi.mocked(resolveUserRequest).mockResolvedValue({access: 'anonymous', cookies: [], userId: null})
  const response = await invokeApiRoute(POST, request())
  expect(response.status).toBe(401)
  expect(generateCloudText).not.toHaveBeenCalled()
  expect(readCloudTextUsage).not.toHaveBeenCalled()
})
it('should expose private account usage and refreshed session cookies', async () => {
  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/cloud-text'))
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
  await expect(response.json()).resolves.toEqual(usage)
  expect(readCloudTextUsage).toHaveBeenCalledWith('user-1')
})
it('should validate input before reserving any generation', async () => {
  const response = await invokeApiRoute(POST, request({...body, maximumTokens: 99999}))
  expect(response.status).toBe(400)
  expect(generateCloudText).not.toHaveBeenCalled()
})
it('should return the generated text with authoritative usage', async () => {
  const response = await invokeApiRoute(POST, request())
  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({text: '결과', tokenCount: 100, usage})
  expect(generateCloudText).toHaveBeenCalledWith('user-1', body)
})
it('should enforce the daily limit through a 429 response', async () => {
  const exhausted = {...usage, remaining: 0, used: 3}
  vi.mocked(generateCloudText).mockResolvedValue({kind: 'exhausted', usage: exhausted})
  const response = await invokeApiRoute(POST, request())
  expect(response.status).toBe(429)
  await expect(response.json()).resolves.toEqual({error: 'daily_limit', usage: exhausted})
})

it('should acknowledge durable admission with 202 before generation completes', async () => {
  const background = Promise.withResolvers<void>()
  vi.mocked(completeApiAiJobs).mockReturnValueOnce(background.promise)
  vi.mocked(generateCloudText).mockResolvedValue({
    kind: 'accepted',
    requestId: body.requestId,
    usage,
  })
  const response = await invokeApiRoute(POST, request())
  expect(response.status).toBe(202)
  await expect(response.json()).resolves.toEqual({requestId: body.requestId, usage})
  expect(waitUntil).toHaveBeenCalledWith(background.promise)
  background.resolve()
})
