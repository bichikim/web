// oxlint-disable eslint-js/camelcase -- Provider Responses request wire contract.
import OpenAI from 'openai'
import {z} from 'zod'
import type {ApiAiModelTestResult} from 'src/features/admin-api-ai/contracts'
import {normalizeResponse} from './normalize-response'
import {OPENROUTER_ROUTING} from './openrouter-routing'
import type {ApiAiProvider, ApiAiTransport} from './types'

const MAXIMUM_TEST_TOKENS = 1024
const TEST_TIMEOUT_MILLISECONDS = 60_000
const MAXIMUM_DIAGNOSTIC_LENGTH = 2000
const metadataSchema = z.object({metadata: z.object({raw: z.string().optional()}).optional()})

/** Sends one greeting to the selected provider model without storage, retries or fallback. */
export const testProviderModel = async (
  provider: ApiAiProvider,
  model: string,
  transport?: ApiAiTransport,
): Promise<ApiAiModelTestResult> => {
  try {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      fetch: transport?.fetch,
      maxRetries: 0,
      timeout: TEST_TIMEOUT_MILLISECONDS,
    })
    const response = normalizeResponse(
      await client.responses.create({
        ...(provider.protocol === 'openrouter-responses-queue' ? OPENROUTER_ROUTING : {}),
        background: false,
        input: '안녕! 한국어로 짧게 한 문장으로 인사해 줘.',
        max_output_tokens: MAXIMUM_TEST_TOKENS,
        model,
        store: false,
        stream: false,
      }),
    )
    return response.status === 'completed'
      ? {
          kind: 'success',
          modelId: response.model,
          text: response.outputText,
          tokenCount: response.tokenCount,
        }
      : {
          details: response.failureCode,
          kind: 'failure',
          message: `모델 테스트가 ${response.status} 상태로 끝났습니다.`,
          retryAfter: null,
          status: null,
        }
  } catch (error: unknown) {
    const providerError = error instanceof OpenAI.APIError ? error : null
    const metadata = metadataSchema.safeParse(providerError?.error)
    return {
      details: metadata.success
        ? (metadata.data.metadata?.raw?.slice(0, MAXIMUM_DIAGNOSTIC_LENGTH) ?? null)
        : null,
      kind: 'failure',
      message:
        error instanceof Error
          ? error.message.slice(0, MAXIMUM_DIAGNOSTIC_LENGTH)
          : '모델 테스트 요청에 실패했습니다.',
      retryAfter: providerError?.headers?.get('retry-after') ?? null,
      status: providerError?.status ?? null,
    }
  }
}
