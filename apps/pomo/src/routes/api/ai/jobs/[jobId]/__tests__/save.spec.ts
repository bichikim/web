/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({resolveUserRequest: vi.fn()}))
const serviceMocks = vi.hoisted(() => ({
  createAiJobResult: vi.fn(),
  deleteAiJobArtifactForUser: vi.fn(),
  getAiJobStatus: vi.fn(),
  saveAiJobArtifactForUser: vi.fn(),
}))

vi.mock('src/server/auth/resolve-user-request', () => authMocks)
vi.mock('src/server/ai/service', () => serviceMocks)

import {DELETE, POST} from '../save'
import {invokeApiRoute} from '../../../../__tests__/invoke'

const JOB_ID = '019d0000-0000-7000-8000-000000000002'
const createRequest = (method: 'DELETE' | 'POST'): Request =>
  new Request(`https://pomo.example/api/ai/jobs/${JOB_ID}/save`, {method})

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: [],
    userId: 'user-1',
  })
  serviceMocks.saveAiJobArtifactForUser.mockResolvedValue({
    id: 'artifact-1',
    lifecycle: 'saved',
  })
  serviceMocks.getAiJobStatus.mockResolvedValue({id: JOB_ID, status: 'succeeded'})
  serviceMocks.createAiJobResult.mockResolvedValue({
    artifact: {
      contentType: 'audio/mpeg',
      expiresAt: '2026-09-20T00:10:00.000Z',
      url: 'https://private.example.test/signed',
    },
  })
  serviceMocks.deleteAiJobArtifactForUser.mockResolvedValue({
    id: 'artifact-1',
    lifecycle: 'deletion_pending',
  })
})

describe('AI job artifact save route', () => {
  it('should save through the owner-scoped storage service and return its result', async () => {
    const response = await invokeApiRoute(POST, createRequest('POST'), {jobId: JOB_ID})

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      result: {artifact: {url: 'https://private.example.test/signed'}},
      saved: true,
    })
    expect(serviceMocks.saveAiJobArtifactForUser).toHaveBeenCalledWith(JOB_ID, 'user-1')
    expect(serviceMocks.getAiJobStatus).toHaveBeenCalledWith(JOB_ID, 'user-1')
    expect(serviceMocks.createAiJobResult).toHaveBeenCalledWith({
      id: JOB_ID,
      status: 'succeeded',
    })
  })

  it('should reject an anonymous save before touching artifact storage', async () => {
    authMocks.resolveUserRequest.mockResolvedValue({access: 'anonymous', cookies: [], userId: null})

    const response = await invokeApiRoute(POST, createRequest('POST'), {jobId: JOB_ID})

    expect(response.status).toBe(401)
    expect(serviceMocks.saveAiJobArtifactForUser).not.toHaveBeenCalled()
  })

  it('should report a missing artifact without creating a download URL', async () => {
    serviceMocks.saveAiJobArtifactForUser.mockResolvedValue(null)

    const response = await invokeApiRoute(POST, createRequest('POST'), {jobId: JOB_ID})

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({error: 'ai_artifact_not_available'})
    expect(serviceMocks.createAiJobResult).not.toHaveBeenCalled()
  })

  it('should report a deletion that requires asynchronous cleanup', async () => {
    const response = await invokeApiRoute(DELETE, createRequest('DELETE'), {jobId: JOB_ID})

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({
      deleted: false,
      deletionPending: true,
    })
    expect(serviceMocks.deleteAiJobArtifactForUser).toHaveBeenCalledWith(JOB_ID, 'user-1')
  })
})
