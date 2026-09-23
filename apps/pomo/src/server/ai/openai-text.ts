// oxlint-disable eslint-js/camelcase -- OpenAI request fields follow the external API contract.
import type {Response, ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses'

import {env} from 'src/env'
import {getOpenAiClient} from 'src/server/history-generation/openai-client'

import {textJobInputSchema} from './contracts'

export interface LunaResponseHandle {
  readonly responseId: string
}

const HTTP_REQUEST_TIMEOUT = 408
const HTTP_CLIENT_ERROR_MINIMUM = 400
const HTTP_SERVER_ERROR_MINIMUM = 500
const HTTP_TOO_MANY_REQUESTS = 429

const getErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined
  }

  const {status} = error
  return typeof status === 'number' ? status : undefined
}

const isRetryableSubmissionError = (error: unknown): boolean => {
  const status = getErrorStatus(error)

  return (
    status === undefined ||
    status === HTTP_REQUEST_TIMEOUT ||
    status === HTTP_TOO_MANY_REQUESTS ||
    status >= HTTP_SERVER_ERROR_MINIMUM ||
    status < HTTP_CLIENT_ERROR_MINIMUM
  )
}

export class LunaTextSubmissionError extends Error {
  readonly retryable: boolean

  constructor(retryable: boolean, cause: unknown) {
    super(cause instanceof Error ? cause.message : 'OpenAI text submission failed', {cause})
    this.name = 'LunaTextSubmissionError'
    this.retryable = retryable
  }
}

const createLunaRequest = (
  jobId: string,
  request: Readonly<Record<string, unknown>>,
): ResponseCreateParamsNonStreaming => {
  const input = textJobInputSchema.parse(request)

  return {
    background: true,
    input: input.messages.map((message) => ({
      content: message.content,
      role: message.role,
    })),
    max_output_tokens: input.parameters.maximumTokens,
    metadata: {pomo_ai_job_id: jobId},
    model: env.OPENAI_MODEL,
    reasoning: {effort: env.OPENAI_REASONING_EFFORT},
    store: true,
    temperature: input.parameters.temperature,
    top_p: input.parameters.topP,
  }
}

export const submitLunaTextJob = async (
  jobId: string,
  request: Readonly<Record<string, unknown>>,
): Promise<LunaResponseHandle> => {
  let client: ReturnType<typeof getOpenAiClient>
  let body: ResponseCreateParamsNonStreaming

  try {
    client = getOpenAiClient()
    body = createLunaRequest(jobId, request)
  } catch (error: unknown) {
    throw new LunaTextSubmissionError(false, error)
  }

  let response: Response
  try {
    response = await client.responses.create(body, {
      idempotencyKey: jobId,
      maxRetries: 0,
      timeout: env.POMO_AI_RUNNER_TIMEOUT_MS,
    })
  } catch (error: unknown) {
    throw new LunaTextSubmissionError(isRetryableSubmissionError(error), error)
  }

  return {responseId: response.id}
}

export const retrieveLunaTextJob = (responseId: string): Promise<Response> =>
  getOpenAiClient().responses.retrieve(responseId)

export const cancelLunaTextJob = (responseId: string): Promise<Response> =>
  getOpenAiClient().responses.cancel(responseId)
