import {beforeEach, expect, it, vi} from 'vitest'

const cronMocks = vi.hoisted(() => ({isAuthorizedCronRequest: vi.fn()}))
const generationMocks = vi.hoisted(() => ({startHistoryRegeneration: vi.fn()}))

vi.mock('src/server/cron/environment', () => cronMocks)
vi.mock('src/server/history-generation/start-regeneration', () => generationMocks)

import {POST} from '../regenerate'
import {invokeApiRoute} from '../../../__tests__/invoke'

const createRequest = (body: BodyInit): Request =>
  new Request('https://pomo.example/api/cron/today-in-history/regenerate', {
    body,
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

beforeEach(() => {
  vi.restoreAllMocks()
  cronMocks.isAuthorizedCronRequest.mockReset().mockReturnValue(true)
  generationMocks.startHistoryRegeneration.mockReset()
})

it('should reject an unauthorized regeneration request', async () => {
  cronMocks.isAuthorizedCronRequest.mockReturnValue(false)

  const response = await invokeApiRoute(POST, createRequest('{}'))

  expect(response.status).toBe(401)
  expect(generationMocks.startHistoryRegeneration).not.toHaveBeenCalled()
})

it.each([
  ['invalid JSON', '{', 400],
  [
    'duplicate titles',
    JSON.stringify({targetDate: '2026-08-26', titles: ['Same', 'Same', 'Other']}),
    400,
  ],
  ['an oversized body', 'x'.repeat(16_385), 413],
])('should reject %s', async (_label, body, status) => {
  const response = await invokeApiRoute(POST, createRequest(body))

  expect(response.status).toBe(status)
  await expect(response.text()).resolves.toBe('Invalid regeneration request')
  expect(generationMocks.startHistoryRegeneration).not.toHaveBeenCalled()
})

it('should submit a normalized regeneration request', async () => {
  generationMocks.startHistoryRegeneration.mockResolvedValue({
    responseId: 'response-1',
    status: 'submitted',
  })

  const response = await invokeApiRoute(
    POST,
    createRequest(
      JSON.stringify({
        targetDate: '2026-08-26',
        titles: [' First ', 'Second', 'Third'],
      }),
    ),
  )

  expect(response.status).toBe(202)
  expect(generationMocks.startHistoryRegeneration).toHaveBeenCalledWith({
    requiredTitles: ['First', 'Second', 'Third'],
    targetDate: {day: 26, isoDate: '2026-08-26', month: 8},
  })
})

it('should return an internal error when regeneration submission fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  generationMocks.startHistoryRegeneration.mockRejectedValue(new Error('OpenAI unavailable'))

  const response = await invokeApiRoute(
    POST,
    createRequest(JSON.stringify({targetDate: '2026-08-26', titles: ['First', 'Second', 'Third']})),
  )

  expect(response.status).toBe(500)
  await expect(response.text()).resolves.toBe('Regeneration submission failed')
})

it('should reject a target date when the validated schema contract is violated', async () => {
  const actualZod = await vi.importActual<typeof import('zod')>('zod')
  vi.doMock('zod', () => ({
    ...actualZod,
    z: {
      ...actualZod.z,
      strictObject: vi.fn(() => ({
        superRefine: vi.fn(() => ({
          parse: vi.fn(() => ({targetDate: 'invalid', titles: ['First', 'Second', 'Third']})),
        })),
      })),
    },
  }))
  vi.resetModules()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  try {
    const {POST: postWithBrokenSchema} = await import('../regenerate')
    const response = await invokeApiRoute(postWithBrokenSchema, createRequest('{}'))

    expect(response.status).toBe(500)
    await expect(response.text()).resolves.toBe('Regeneration submission failed')
    expect(generationMocks.startHistoryRegeneration).not.toHaveBeenCalled()
  } finally {
    vi.doUnmock('zod')
    vi.resetModules()
  }
})
