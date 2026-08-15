// oxlint-disable eslint-js/camelcase -- OpenAI request fields follow the external API contract.
import OpenAI from 'openai'
import {zodTextFormat} from 'openai/helpers/zod'

import {
  buildHistoryPrompt,
  historyGenerationOpenAiOutputSchema,
  type HistorySourcePolicy,
  type HistoryTargetDate,
} from '../../features/history-generation'
import {getOpenAiConfiguration, getOpenAiWebhookSecret} from '../ai/environment'

export interface SubmitHistoryResponseOptions {
  readonly generationRunId: string
  readonly policy: HistorySourcePolicy
  readonly promptVersion: string
  readonly targetDate: HistoryTargetDate
}

export interface SubmittedHistoryResponse {
  readonly responseId: string
}

let openAiClient: OpenAI | undefined

/** Returns the lazily initialized server-only OpenAI client. */
export const getOpenAiClient = (): OpenAI => {
  const configuration = getOpenAiConfiguration()

  openAiClient ??= new OpenAI({
    apiKey: configuration.apiKey,
    webhookSecret: process.env.OPENAI_WEBHOOK_SECRET,
  })

  return openAiClient
}

/** Registers one durable history research and editing job with OpenAI. */
export const submitHistoryResponse = async (
  options: SubmitHistoryResponseOptions,
): Promise<SubmittedHistoryResponse> => {
  const configuration = getOpenAiConfiguration()
  const response = await getOpenAiClient().responses.create({
    background: true,
    include: ['web_search_call.action.sources'],
    input: buildHistoryPrompt({policy: options.policy, targetDate: options.targetDate}),
    metadata: {
      generation_run_id: options.generationRunId,
      prompt_version: options.promptVersion,
      source_policy_version: options.policy.version,
    },
    model: configuration.model,
    reasoning: {effort: configuration.reasoningEffort},
    service_tier: configuration.serviceTier,
    store: true,
    text: {
      format: zodTextFormat(historyGenerationOpenAiOutputSchema, 'history_generation'),
      verbosity: 'low',
    },
    tool_choice: 'required',
    tools: [
      {
        filters: {allowed_domains: [...options.policy.allowedDomains]},
        search_context_size: 'medium',
        type: 'web_search',
        user_location: {
          country: 'KR',
          timezone: 'Asia/Seoul',
          type: 'approximate',
        },
      },
    ],
  })

  return {responseId: response.id}
}

/** Verifies and parses an OpenAI webhook from its untouched request body. */
export const unwrapOpenAiWebhook = (body: string, headers: Headers) =>
  getOpenAiClient().webhooks.unwrap(body, headers, getOpenAiWebhookSecret())
