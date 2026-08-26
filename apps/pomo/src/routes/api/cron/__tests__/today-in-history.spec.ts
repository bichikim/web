import {beforeEach, expect, it, vi} from 'vitest'

const cronMocks = vi.hoisted(() => ({isAuthorizedCronRequest: vi.fn()}))
const generationMocks = vi.hoisted(() => ({startHistoryGeneration: vi.fn()}))

vi.mock('src/server/cron/environment', () => cronMocks)
vi.mock('src/server/history-generation/start-generation', () => generationMocks)

import {GET} from '../today-in-history'
import {invokeApiRoute} from '../../__tests__/invoke'

beforeEach(() => {
  vi.restoreAllMocks()
  cronMocks.isAuthorizedCronRequest.mockReset().mockReturnValue(true)
  generationMocks.startHistoryGeneration.mockReset()
})

it('should reject an unauthorized cron request', async () => {
  cronMocks.isAuthorizedCronRequest.mockReturnValue(false)

  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/cron/today-in-history'),
  )

  expect(response.status).toBe(401)
  await expect(response.text()).resolves.toBe('Unauthorized')
})

it.each([
  ['submitted', 202],
  ['already_exists', 200],
])('should return %i when generation is %s', async (status, expectedStatus) => {
  generationMocks.startHistoryGeneration.mockResolvedValue({status})

  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/cron/today-in-history'),
  )

  expect(response.status).toBe(expectedStatus)
  await expect(response.json()).resolves.toEqual({status})
})

it('should return an internal error when generation fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  generationMocks.startHistoryGeneration.mockRejectedValue(new Error('OpenAI unavailable'))

  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/cron/today-in-history'),
  )

  expect(response.status).toBe(500)
  await expect(response.text()).resolves.toBe('Generation submission failed')
})
