import {HTTPError} from 'h3'
import {beforeEach, expect, it, vi} from 'vitest'

const h3Mocks = vi.hoisted(() => ({assertBodySize: vi.fn()}))
const webhookMocks = vi.hoisted(() => ({
  handleOpenAiResponseEvent: vi.fn(),
  unwrapOpenAiWebhook: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {...actual, assertBodySize: h3Mocks.assertBodySize}
})
vi.mock('src/server/history-generation/handle-openai-webhook', () => ({
  handleOpenAiResponseEvent: webhookMocks.handleOpenAiResponseEvent,
}))
vi.mock('src/server/history-generation/openai-client', () => ({
  unwrapOpenAiWebhook: webhookMocks.unwrapOpenAiWebhook,
}))

import {POST} from '../openai'
import {invokeApiRoute} from '../../__tests__/invoke'

const createRequest = (body = '{}'): Request =>
  new Request('https://pomo.example/api/webhooks/openai', {
    body,
    headers: {'OpenAI-Signature': 'signature'},
    method: 'POST',
  })

beforeEach(() => {
  vi.restoreAllMocks()
  h3Mocks.assertBodySize.mockReset()
  webhookMocks.handleOpenAiResponseEvent.mockReset()
  webhookMocks.unwrapOpenAiWebhook.mockReset()
})

it('should reject an oversized webhook before reading it', async () => {
  h3Mocks.assertBodySize.mockImplementation(() => {
    throw HTTPError.status(413)
  })

  const response = await invokeApiRoute(POST, createRequest())

  expect(response.status).toBe(413)
  await expect(response.text()).resolves.toBe('Webhook payload too large')
  expect(webhookMocks.unwrapOpenAiWebhook).not.toHaveBeenCalled()
})

it('should propagate an unexpected request-reading error to the server boundary', async () => {
  const error = new Error('stream unavailable')
  h3Mocks.assertBodySize.mockImplementation(() => {
    throw error
  })

  const response = await invokeApiRoute(POST, createRequest())

  expect(response.status).toBe(500)
})

it('should reject an invalid webhook signature', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  webhookMocks.unwrapOpenAiWebhook.mockRejectedValue(new Error('invalid signature'))

  const response = await invokeApiRoute(POST, createRequest('payload'))

  expect(response.status).toBe(400)
  await expect(response.text()).resolves.toBe('Invalid webhook signature')
  expect(webhookMocks.unwrapOpenAiWebhook).toHaveBeenCalledWith('payload', expect.any(Headers))
})

it('should ignore a webhook unrelated to response completion', async () => {
  webhookMocks.unwrapOpenAiWebhook.mockResolvedValue({type: 'batch.completed'})

  const response = await invokeApiRoute(POST, createRequest())

  expect(response.status).toBe(204)
  expect(webhookMocks.handleOpenAiResponseEvent).not.toHaveBeenCalled()
})

it.each(['response.cancelled', 'response.completed', 'response.failed', 'response.incomplete'])(
  'should process a %s webhook',
  async (type) => {
    const webhook = {response: {id: 'response-1'}, type}
    webhookMocks.unwrapOpenAiWebhook.mockResolvedValue(webhook)

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ok: true})
    expect(webhookMocks.handleOpenAiResponseEvent).toHaveBeenCalledWith(webhook)
  },
)

it('should return an internal error when response processing fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  webhookMocks.unwrapOpenAiWebhook.mockResolvedValue({type: 'response.completed'})
  webhookMocks.handleOpenAiResponseEvent.mockRejectedValue(new Error('database unavailable'))

  const response = await invokeApiRoute(POST, createRequest())

  expect(response.status).toBe(500)
  await expect(response.text()).resolves.toBe('Webhook processing failed')
})
