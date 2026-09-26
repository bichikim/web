import {z} from 'zod'

import type {
  DenseEmbeddingProvider,
  EmbeddingBatchResult,
  EmbeddingFailure,
} from '../embedding/provider'

export interface CreateOllamaEmbeddingProviderOptions {
  readonly baseUrl: string
  readonly fetch?: typeof globalThis.fetch
  readonly model: string
}

const RATE_LIMITED_STATUS = 429
const SERVER_ERROR_STATUS = 500

const responseSchema = z.object({
  embeddings: z.array(z.array(z.number().finite())).min(1),
  model: z.string().min(1),
})

const invalidResponse = (detail: string): EmbeddingFailure => ({
  error: {
    code: 'invalid-embedding-response',
    detail,
    retryable: false,
  },
  ok: false,
})

const errorDetail = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const endpointFrom = (baseUrl: string): string => {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  return new URL('api/embed', normalizedBaseUrl).toString()
}

export const createOllamaEmbeddingProvider = (
  options: CreateOllamaEmbeddingProviderOptions,
): DenseEmbeddingProvider => {
  const fetch = options.fetch ?? globalThis.fetch
  const endpoint = endpointFrom(options.baseUrl)

  return {
    async embed(inputs): Promise<EmbeddingBatchResult> {
      if (inputs.length === 0) {
        return {
          error: {
            code: 'empty-embedding-input',
            retryable: false,
          },
          ok: false,
        }
      }

      let response: Response

      try {
        response = await fetch(endpoint, {
          body: JSON.stringify({
            input: inputs,
            model: options.model,
            truncate: false,
          }),
          headers: {
            'content-type': 'application/json',
          },
          method: 'POST',
        })
      } catch (error: unknown) {
        return {
          error: {
            code: 'embedding-unavailable',
            detail: errorDetail(error),
            retryable: true,
          },
          ok: false,
        }
      }

      if (!response.ok) {
        return {
          error: {
            code: 'embedding-request-failed',
            retryable:
              response.status === RATE_LIMITED_STATUS || response.status >= SERVER_ERROR_STATUS,
            status: response.status,
          },
          ok: false,
        }
      }

      let body: unknown

      try {
        body = await response.json()
      } catch (error: unknown) {
        return invalidResponse(`response: ${errorDetail(error)}`)
      }

      const parsedBody = responseSchema.safeParse(body)

      if (!parsedBody.success) {
        return invalidResponse(
          `response: ${parsedBody.error.issues.map((issue) => issue.message).join('; ')}`,
        )
      }

      if (parsedBody.data.embeddings.length !== inputs.length) {
        return invalidResponse(
          `count: expected ${inputs.length}, received ${parsedBody.data.embeddings.length}`,
        )
      }

      const dimensions = parsedBody.data.embeddings[0].length

      if (
        dimensions === 0 ||
        parsedBody.data.embeddings.some((embedding) => embedding.length !== dimensions)
      ) {
        return invalidResponse('dimension: vectors must have one non-zero size')
      }

      return {
        ok: true,
        value: {
          identity: {
            dimensions,
            model: parsedBody.data.model,
            provider: 'ollama',
          },
          vectors: parsedBody.data.embeddings,
        },
      }
    },
  }
}
