import {beforeEach, expect, it, vi} from 'vitest'

const cronMocks = vi.hoisted(() => ({isAuthorizedCronRequest: vi.fn()}))
const recoveryMocks = vi.hoisted(() => ({recoverHistoryGenerations: vi.fn()}))

vi.mock('src/server/cron/environment', () => cronMocks)
vi.mock('src/server/history-generation/recover-generations', () => recoveryMocks)

import {GET} from '../recover'
import {invokeApiRoute} from '../../../__tests__/invoke'

beforeEach(() => {
  vi.restoreAllMocks()
  cronMocks.isAuthorizedCronRequest.mockReset().mockReturnValue(true)
  recoveryMocks.recoverHistoryGenerations.mockReset()
})

it('should reject an unauthorized recovery request', async () => {
  cronMocks.isAuthorizedCronRequest.mockReturnValue(false)

  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/cron/today-in-history/recover'),
  )

  expect(response.status).toBe(401)
})

it('should return an empty response when no generation was checked', async () => {
  recoveryMocks.recoverHistoryGenerations.mockResolvedValue({checked: 0})

  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/cron/today-in-history/recover'),
  )

  expect(response.status).toBe(204)
})

it('should return recovery totals when generations were checked', async () => {
  recoveryMocks.recoverHistoryGenerations.mockResolvedValue({checked: 2, completed: 1})

  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/cron/today-in-history/recover'),
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({checked: 2, completed: 1})
})

it('should return an internal error when recovery fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  recoveryMocks.recoverHistoryGenerations.mockRejectedValue(new Error('database unavailable'))

  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/cron/today-in-history/recover'),
  )

  expect(response.status).toBe(500)
  await expect(response.text()).resolves.toBe('Generation recovery failed')
})
