import type {Response} from 'openai/resources/responses/responses'
import {extractSearchSourceUrls} from './extract-search-source-urls'
import type {ApiAiResponse} from './types'

const MAXIMUM_PERSISTED_TOKENS = 2_147_483_647

/** Normalizes provider output and usage into the persisted job result contract. */
export const normalizeResponse = (response: Response): ApiAiResponse => {
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
    searchSourceUrls: extractSearchSourceUrls(response.output),
    status: invalidCompletion ? 'failed' : response.status,
    tokenCount,
  }
}
