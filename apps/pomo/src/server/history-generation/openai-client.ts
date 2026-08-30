// oxlint-disable eslint-js/camelcase -- OpenAI request fields follow the external API contract.
import OpenAI from 'openai'
import {zodTextFormat} from 'openai/helpers/zod'
import type {ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses'

import {
  buildHistoryPrompt,
  historyGenerationOpenAiOutputSchema,
  type HistorySourcePolicy,
  type HistoryTargetDate,
} from 'src/features/history-generation'
import {env} from 'src/env'

import {isGpt56Model} from './is-gpt-56-model'

interface OpenAiConfiguration {
  readonly apiKey: string
  readonly model: string
  readonly reasoningEffort: typeof env.OPENAI_REASONING_EFFORT
  readonly serviceTier: typeof env.OPENAI_SERVICE_TIER
}

const HTTP_CLIENT_ERROR_MINIMUM = 400
const HTTP_SERVER_ERROR_MINIMUM = 500
const HTTP_REQUEST_TIMEOUT = 408

export interface SubmitHistoryResponseOptions {
  readonly generationRunId: string
  readonly policy: HistorySourcePolicy
  readonly promptVersion: string
  readonly requiredTitles?: ReadonlyArray<string>
  readonly submissionKey: string
  readonly targetDate: HistoryTargetDate
}

export interface SubmittedHistoryResponse {
  readonly responseId: string
}

type SubmissionAcceptance = 'rejected' | 'unknown'

export class HistorySubmissionError extends Error {
  readonly acceptance: SubmissionAcceptance

  constructor(acceptance: SubmissionAcceptance, cause: unknown) {
    const message = cause instanceof Error ? cause.message : 'Unknown OpenAI submission error'

    super(message, {cause})
    this.name = 'HistorySubmissionError'
    this.acceptance = acceptance
  }
}

let openAiClient: OpenAI | undefined

const readOpenAiConfiguration = (): OpenAiConfiguration => {
  if (isGpt56Model(env.OPENAI_MODEL) && env.OPENAI_REASONING_EFFORT === 'minimal') {
    throw new TypeError('OPENAI_REASONING_EFFORT cannot be minimal when OPENAI_MODEL is GPT-5.6')
  }

  return {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    reasoningEffort: env.OPENAI_REASONING_EFFORT,
    serviceTier: env.OPENAI_SERVICE_TIER,
  }
}

const buildHistoryResponseRequest = (
  options: SubmitHistoryResponseOptions,
  configuration: OpenAiConfiguration,
): ResponseCreateParamsNonStreaming => {
  const metadata: Record<string, string> = {
    generation_run_id: options.generationRunId,
    prompt_version: options.promptVersion,
    source_policy_version: options.policy.version,
    submission_key: options.submissionKey,
  }

  if (options.requiredTitles !== undefined) {
    metadata.required_titles = JSON.stringify(options.requiredTitles)
  }

  return {
    background: true,
    include: ['web_search_call.action.sources'],
    input: buildHistoryPrompt({
      policy: options.policy,
      requiredTitles: options.requiredTitles,
      targetDate: options.targetDate,
    }),
    metadata,
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
  }
}

/** Returns the lazily initialized server-only OpenAI client. */
export const getOpenAiClient = (): OpenAI => {
  const configuration = readOpenAiConfiguration()

  openAiClient ??= new OpenAI({
    apiKey: configuration.apiKey,
    webhookSecret: env.OPENAI_WEBHOOK_SECRET,
  })

  return openAiClient
}

/** Registers one durable history research and editing job with OpenAI. */
export const submitHistoryResponse = async (
  options: SubmitHistoryResponseOptions,
  client?: OpenAI,
): Promise<SubmittedHistoryResponse> => {
  let request: ResponseCreateParamsNonStreaming
  let responseClient: OpenAI

  try {
    const configuration = readOpenAiConfiguration()
    request = buildHistoryResponseRequest(options, configuration)
    responseClient = client ?? getOpenAiClient()
  } catch (error) {
    throw new HistorySubmissionError('rejected', error)
  }

  try {
    const response = await responseClient.responses.create(request, {maxRetries: 0})

    return {responseId: response.id}
  } catch (error) {
    const acceptance =
      error instanceof OpenAI.APIError &&
      error.status !== undefined &&
      error.status >= HTTP_CLIENT_ERROR_MINIMUM &&
      error.status < HTTP_SERVER_ERROR_MINIMUM &&
      error.status !== HTTP_REQUEST_TIMEOUT
        ? 'rejected'
        : 'unknown'

    throw new HistorySubmissionError(acceptance, error)
  }
}

/** Verifies and parses an OpenAI webhook from its untouched request body. */
export const unwrapOpenAiWebhook = (body: string, headers: Headers) =>
  getOpenAiClient().webhooks.unwrap(body, headers, env.OPENAI_WEBHOOK_SECRET)
