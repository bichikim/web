import {SERVER_AI_RELEASED} from './release'
import {z} from 'zod'

import {apiJsonRequest, type ApiJsonRequestOptions, parseJsonResponse} from '../api-json'
import {readStoredAppSession} from '../user-auth/app-session'
import {
  type AiJob,
  aiJobErrorResponseSchema,
  type AiJobResult,
  aiJobResultSchema,
  aiJobSchema,
  type AiTextAccess,
  aiTextAccessSchema,
  type AiTextJobInput,
} from './contracts'

const createResponseSchema = z.object({created: z.boolean(), job: aiJobSchema})
const jobResponseSchema = z.object({job: aiJobSchema})
const resultResponseSchema = aiJobResultSchema.transform((result) => ({result}))
const saveResponseSchema = aiJobResultSchema.transform((result) => ({result, saved: true}))

export interface AiJobArtifactDeleteResult {
  readonly deleted: boolean
  readonly deletionPending?: boolean
}

const deleteResponseSchema = z.object({
  deleted: z.boolean(),
  deletionPending: z.boolean().optional(),
})
const RANDOM_SUFFIX_RADIX = 36

const createRequestOptions = async (): Promise<
  Pick<ApiJsonRequestOptions, 'credentials' | 'headers'>
> => {
  if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS !== 'true') {
    return {credentials: 'include'}
  }

  const token = await readStoredAppSession()
  return token === null ? {} : {headers: {Authorization: `Bearer ${token}`}}
}

export class AiJobClientError extends Error {
  readonly code: string
  readonly job: AiJob | undefined
  readonly status: number

  constructor(options: {readonly code: string; readonly job?: AiJob; readonly status: number}) {
    super(options.code)
    this.name = 'AiJobClientError'
    this.code = options.code
    this.job = options.job
    this.status = options.status
  }
}

export interface AiJobClient {
  readonly cancelJob: (jobId: string) => Promise<AiJob>
  readonly deleteJobArtifact: (jobId: string) => Promise<AiJobArtifactDeleteResult>
  readonly getJob: (jobId: string) => Promise<AiJob>
  readonly getJobResult: (jobId: string) => Promise<AiJobResult>
  readonly readTextAccess: () => Promise<AiTextAccess>
  readonly saveJobArtifact: (jobId: string) => Promise<AiJobResult>
  readonly submitTextJob: (input: {
    readonly idempotencyKey: string
    readonly input: AiTextJobInput
  }) => Promise<{readonly created: boolean; readonly job: AiJob}>
}

const readClientError = async (response: Response): Promise<AiJobClientError> => {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }

  const parsed = aiJobErrorResponseSchema.safeParse(body)
  return new AiJobClientError({
    code: parsed.success ? parsed.data.error : `http_${response.status}`,
    job: parsed.success ? parsed.data.job : undefined,
    status: response.status,
  })
}

const request = async <Output>(
  path: string,
  options: Parameters<typeof apiJsonRequest>[1],
  schema: z.ZodType<Output>,
): Promise<Output> => {
  if (!SERVER_AI_RELEASED) {
    throw new AiJobClientError({code: 'ai_feature_unreleased', status: 404})
  }
  const response = await apiJsonRequest(path, {
    ...(await createRequestOptions()),
    ...options,
  })
  if (!response.ok) {
    throw await readClientError(response)
  }

  return parseJsonResponse(response, schema, options.signal)
}

const createIdempotencyKey = (): string => {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid ?? `${Date.now()}-${Math.random().toString(RANDOM_SUFFIX_RADIX).slice(2)}`
}

export const createAiJobIdempotencyKey = createIdempotencyKey

export const aiJobClient: AiJobClient = {
  cancelJob: async (jobId) =>
    request(
      `ai/jobs/${encodeURIComponent(jobId)}/cancel`,
      {method: 'POST', retry: false},
      jobResponseSchema,
    ).then((response) => response.job),
  deleteJobArtifact: async (jobId) =>
    request(
      `ai/jobs/${encodeURIComponent(jobId)}/save`,
      {method: 'DELETE', retry: false},
      deleteResponseSchema,
    ),
  getJob: async (jobId) =>
    request(`ai/jobs/${encodeURIComponent(jobId)}`, {}, jobResponseSchema).then(
      (response) => response.job,
    ),
  getJobResult: async (jobId) =>
    request(`ai/jobs/${encodeURIComponent(jobId)}/result`, {}, resultResponseSchema).then(
      (response) => response.result,
    ),
  readTextAccess: async () => request('ai/access', {}, aiTextAccessSchema),
  saveJobArtifact: async (jobId) =>
    request(
      `ai/jobs/${encodeURIComponent(jobId)}/save`,
      {method: 'POST', retry: false},
      saveResponseSchema,
    ).then((response) => response.result),
  submitTextJob: async ({idempotencyKey, input}) =>
    request(
      'ai/jobs',
      {
        body: {capability: 'text', idempotencyKey, input},
        method: 'POST',
        retry: false,
      },
      createResponseSchema,
    ),
}
