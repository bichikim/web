/** @vitest-environment node */

import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({resolveUserRequest: vi.fn()}))
const serviceMocks = vi.hoisted(() => ({getAiTextAccess: vi.fn()}))

vi.mock('src/server/auth/resolve-user-request', () => authMocks)
vi.mock('src/server/ai/service', () => serviceMocks)

import {GET} from '../access'
import {invokeApiRoute} from '../../__tests__/invoke'

describe('AI access route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.resolveUserRequest.mockResolvedValue({
      access: 'user',
      cookies: ['session=refreshed'],
      userId: 'user-1',
    })
    serviceMocks.getAiTextAccess.mockResolvedValue({
      available: true,
      modelId: 'gpt-5.6-luna',
    })
  })

  it('should return the active server model without exposing a catalog', async () => {
    const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/ai/access'))

    expect(response.status).toBe(200)
    expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
    await expect(response.json()).resolves.toEqual({
      available: true,
      modelId: 'gpt-5.6-luna',
    })
    expect(serviceMocks.getAiTextAccess).toHaveBeenCalledWith('user-1')
  })

  it('should report unavailable server access without quota details', async () => {
    serviceMocks.getAiTextAccess.mockResolvedValue({available: false, modelId: null})

    const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/ai/access'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({available: false, modelId: null})
  })

  it('should reject anonymous access before checking entitlement', async () => {
    authMocks.resolveUserRequest.mockResolvedValue({
      access: 'anonymous',
      cookies: [],
      userId: null,
    })

    const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/ai/access'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({error: 'unauthorized'})
    expect(serviceMocks.getAiTextAccess).not.toHaveBeenCalled()
  })
})
