// oxlint-disable eslint-js/camelcase -- Requests follow the stateless Responses wire contract.
import OpenAI from 'openai'
import {z} from 'zod'
import {API_AI_POLICY} from './policy'
import {normalizeResponse} from './normalize-response'
import {OPENROUTER_ROUTING} from './openrouter-routing'
import type {ApiAiAdapter, ApiAiTransport} from './types'

/** Executes stateless cloud-text requests without provider-side storage or SDK retries. */
export const createOpenRouterAdapter = (
  transport?: ApiAiTransport,
): Pick<ApiAiAdapter, 'submit'> => ({
  submit: async (provider, body, attemptId, timeoutMilliseconds) => {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      fetch: transport?.fetch,
      maxRetries: 0,
      timeout: timeoutMilliseconds ?? API_AI_POLICY.cloudGenerationMilliseconds,
    })
    const response = await client.responses.create({
      ...OPENROUTER_ROUTING,
      background: false,
      input: body.input as Parameters<typeof client.responses.create>[0]['input'],
      max_output_tokens:
        typeof body.max_output_tokens === 'number' ? body.max_output_tokens : undefined,
      model: typeof body.model === 'string' ? body.model : (provider.models['cloud-text'] ?? ''),
      store: false,
      stream: false,
    })
    if (response.status === 'queued' || response.status === 'in_progress') {
      throw new TypeError('OpenRouter must return a terminal response')
    }
    const normalized = normalizeResponse(response)
    return {
      ...normalized,
      metadata: {
        ...z.record(z.string(), z.string()).parse(body.metadata ?? {}),
        pomo_api_attempt_id: attemptId,
      },
    }
  },
})
