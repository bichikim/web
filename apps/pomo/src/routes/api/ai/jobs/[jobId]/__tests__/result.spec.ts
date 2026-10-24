/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({resolveUserRequest: vi.fn()}))
const serviceMocks = vi.hoisted(() => ({
  createAiJobResult: vi.fn(),
  createPublicJob: vi.fn(),
  getAiJobStatus: vi.fn(),
}))

vi.mock('src/server/auth/resolve-user-request', () => authMocks)
vi.mock('src/server/ai/service', () => serviceMocks)

import {GET} from '../result'
import {invokeApiRoute} from '../../../../__tests__/invoke'

const JOB_ID = '019d0000-0000-7000-8000-000000000002'
const createRequest = (): Request =>
  new Request(`https://pomo.example/api/ai/jobs/${JOB_ID}/result`)

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: [],
    userId: 'user-1',
  })
  serviceMocks.getAiJobStatus.mockResolvedValue({
    id: JOB_ID,
    status: 'succeeded',
  })
  serviceMocks.createAiJobResult.mockResolvedValue({
    artifact: {
      contentType: 'audio/mpeg',
      expiresAt: '2026-09-20T00:10:00.000Z',
      url: 'https://private.example.test/signed',
    },
  })
  serviceMocks.createPublicJob.mockReturnValue({id: JOB_ID, status: 'running'})
})

describe('AI job result route', () => {
  it('should require an authenticated owner before reading the job', async () => {
    authMocks.resolveUserRequest.mockResolvedValue({access: 'anonymous', cookies: [], userId: null})

    const response = await invokeApiRoute(GET, createRequest(), {jobId: JOB_ID})

    expect(response.status).toBe(401)
    expect(serviceMocks.getAiJobStatus).not.toHaveBeenCalled()
    expect(serviceMocks.createAiJobResult).not.toHaveBeenCalled()
  })

  it('should return the owner-scoped signed result', async () => {
    const response = await invokeApiRoute(GET, createRequest(), {jobId: JOB_ID})

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      result: {
        artifact: {
          contentType: 'audio/mpeg',
          expiresAt: '2026-09-20T00:10:00.000Z',
          url: 'https://private.example.test/signed',
        },
      },
    })
    expect(serviceMocks.getAiJobStatus).toHaveBeenCalledWith(JOB_ID, 'user-1')
    expect(serviceMocks.createAiJobResult).toHaveBeenCalledWith({
      id: JOB_ID,
      status: 'succeeded',
    })
  })

  it('should hide a job that is not visible to the authenticated owner', async () => {
    serviceMocks.getAiJobStatus.mockResolvedValue(null)

    const response = await invokeApiRoute(GET, createRequest(), {jobId: JOB_ID})

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({error: 'ai_job_not_found'})
    expect(serviceMocks.createAiJobResult).not.toHaveBeenCalled()
  })

  it('should reject a job before asking storage for its result', async () => {
    const pendingJob = {id: JOB_ID, status: 'running'}
    serviceMocks.getAiJobStatus.mockResolvedValue(pendingJob)

    const response = await invokeApiRoute(GET, createRequest(), {jobId: JOB_ID})

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'ai_job_not_ready',
      job: {id: JOB_ID, status: 'running'},
    })
    expect(serviceMocks.createPublicJob).toHaveBeenCalledWith(pendingJob)
    expect(serviceMocks.createAiJobResult).not.toHaveBeenCalled()
  })
})
