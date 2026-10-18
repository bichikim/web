// oxlint-disable eslint-js/camelcase -- Responses wire fields follow the external API contract.
import OpenAI from 'openai'
import {normalizeResponse} from './normalize-response'
import type {ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses'
import type {ApiAiAdapter, ApiAiProvider, ApiAiWebhookEvent} from './types'

const PROVIDER_TIMEOUT_MILLISECONDS = 30_000

const createClient = (provider: ApiAiProvider): OpenAI =>
  new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl,
    maxRetries: 0,
    timeout: PROVIDER_TIMEOUT_MILLISECONDS,
    webhookSecret: provider.webhookSecret,
  })

export const responsesAdapter: ApiAiAdapter = {
  cancel: async (provider, responseId) =>
    normalizeResponse(await createClient(provider).responses.cancel(responseId)),
  retrieve: async (provider, responseId) =>
    normalizeResponse(
      await createClient(provider).responses.retrieve(responseId, {
        include: ['web_search_call.action.sources'],
      }),
    ),
  submit: async (provider, body, attemptId) => {
    const request = {
      ...body,
      background: true,
      store: true,
    } as unknown as ResponseCreateParamsNonStreaming
    return normalizeResponse(
      await createClient(provider).responses.create(request, {
        headers: {'Idempotency-Key': attemptId},
        idempotencyKey: attemptId,
      }),
    )
  },
}

/** Verifies the untouched callback body with the selected provider's signing secret. */
export const unwrapApiAiWebhook = async (
  provider: ApiAiProvider,
  body: string,
  headers: Headers,
): Promise<ApiAiWebhookEvent | null> => {
  if (provider.protocol === 'openrouter-responses-queue' || !provider.webhookSecret) {
    throw new TypeError('AI provider does not support signed background callbacks')
  }
  const event = await createClient(provider).webhooks.unwrap(body, headers)
  switch (event.type) {
    case 'response.cancelled':
    case 'response.completed':
    case 'response.failed':
    case 'response.incomplete':
      return event
    default:
      return null
  }
}
