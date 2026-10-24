/** @vitest-environment node */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const apiMocks = vi.hoisted(() => ({
  apiJsonRequest: vi.fn(),
  parseJsonResponse: vi.fn(),
}))
const sessionMocks = vi.hoisted(() => ({readStoredAppSession: vi.fn()}))

vi.mock('../../api-json', () => apiMocks)
vi.mock('../../user-auth/app-session', () => sessionMocks)

import {aiJobClient} from '../client'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  sessionMocks.readStoredAppSession.mockResolvedValue(null)
  apiMocks.apiJsonRequest.mockResolvedValue(new Response(null, {status: 200}))
  apiMocks.parseJsonResponse.mockResolvedValue({available: true, modelId: 'gpt-5.6-luna'})
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should use the web session cookie for AI access', async () => {
  await aiJobClient.readTextAccess()

  expect(apiMocks.apiJsonRequest).toHaveBeenCalledWith(
    'ai/access',
    expect.objectContaining({credentials: 'include'}),
  )
  expect(sessionMocks.readStoredAppSession).not.toHaveBeenCalled()
})

it('should use the stored Apps-in-Toss bearer token for AI access', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  sessionMocks.readStoredAppSession.mockResolvedValue('toss-token')

  await aiJobClient.readTextAccess()

  expect(apiMocks.apiJsonRequest).toHaveBeenCalledWith(
    'ai/access',
    expect.objectContaining({headers: {Authorization: 'Bearer toss-token'}}),
  )
})

it('should preserve a stable server error code from an AI response', async () => {
  apiMocks.apiJsonRequest.mockResolvedValue(
    new Response(JSON.stringify({error: 'not-entitled'}), {status: 403}),
  )

  await expect(aiJobClient.readTextAccess()).rejects.toMatchObject({
    code: 'not-entitled',
    status: 403,
  })
})

// Exercise the retained implementation without changing the production release decision.
vi.mock('src/features/ai-job/release', () => ({SERVER_AI_RELEASED: true}))
