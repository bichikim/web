// oxlint-disable eslint-js/camelcase -- Responses wire fields follow the external API contract.
import OpenAI from 'openai'
import type {Response, ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses'
import type {ApiAiAdapter, ApiAiProvider, ApiAiResponse, ApiAiWebhookEvent} from './types'

const PROVIDER_TIMEOUT_MILLISECONDS = 30_000
const MAXIMUM_PERSISTED_TOKENS = 2_147_483_647

const createClient = (provider: ApiAiProvider): OpenAI =>
  new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl,
    maxRetries: 0,
    timeout: PROVIDER_TIMEOUT_MILLISECONDS,
    webhookSecret: provider.webhookSecret,
  })

const normalizeResponse = (response: Response): ApiAiResponse => {
  if (response.status === undefined) {
    throw new TypeError('AI provider response has no status')
  }
  const outputText = response.output
    .flatMap((item) =>
      item.type === 'message'
        ? item.content.flatMap((content) => (content.type === 'output_text' ? [content.text] : []))
        : [],
    )
    .join('')
  const reportedTokens = response.usage?.total_tokens
  const tokenCount =
    typeof reportedTokens === 'number' &&
    Number.isInteger(reportedTokens) &&
    reportedTokens >= 0 &&
    reportedTokens <= MAXIMUM_PERSISTED_TOKENS
      ? reportedTokens
      : null
  const invalidCompletion =
    response.status === 'completed' && (!outputText.trim() || tokenCount === null)
  const failureCode = invalidCompletion ? 'invalid_completion' : (response.error?.code ?? null)
  return {
    failureCode,
    fallback: failureCode === 'server_error' || failureCode === 'rate_limit_exceeded',
    metadata: response.metadata ?? {},
    model: response.model,
    outputText,
    responseId: response.id,
    searchSourceUrls: [
      ...new Set(
        response.output.flatMap((item) =>
          item.type === 'web_search_call' && item.action.type === 'search'
            ? (item.action.sources ?? []).map((source) => source.url)
            : [],
        ),
      ),
    ],
    status: invalidCompletion ? 'failed' : response.status,
    tokenCount,
  }
}

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
