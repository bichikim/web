import {z} from 'zod'

const MAXIMUM_JOB_PROGRESS = 100
const MAXIMUM_MESSAGE_LENGTH = 12_000
const MAXIMUM_MESSAGE_COUNT = 64
const MAXIMUM_TOKENS = 4_096

export const aiJobStatusSchema = z.enum([
  'queued',
  'running',
  'recovery_pending',
  'succeeded',
  'failed',
  'cancelled',
  'timed_out',
])

export type AiJobStatus = z.infer<typeof aiJobStatusSchema>

const aiArtifactSchema = z
  .object({
    contentType: z.string(),
    durationMs: z.number().optional(),
    expiresAt: z.string().datetime().optional(),
    sizeBytes: z.number().optional(),
    url: z.string().url().optional(),
  })
  .passthrough()

export const aiJobResultSchema = z
  .object({
    artifact: aiArtifactSchema.optional(),
    text: z.string().optional(),
  })
  .passthrough()

export type AiJobResult = z.infer<typeof aiJobResultSchema>

export const aiJobSchema = z.object({
  capability: z.string(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  error: z.object({code: z.string(), message: z.string().nullable()}).nullable(),
  id: z.string().min(1),
  lastRunnerError: z.string().nullable(),
  modelId: z.string(),
  progress: z.number().min(0).max(MAXIMUM_JOB_PROGRESS),
  result: aiJobResultSchema.nullable(),
  startedAt: z.string().datetime().nullable(),
  status: aiJobStatusSchema,
  timeoutAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AiJob = z.infer<typeof aiJobSchema>

export const aiTextAccessSchema = z.object({
  available: z.boolean(),
  modelId: z.string().nullable(),
})

export type AiTextAccess = z.infer<typeof aiTextAccessSchema>

export const aiTextMessageSchema = z.object({
  content: z.string().trim().min(1).max(MAXIMUM_MESSAGE_LENGTH),
  role: z.enum(['assistant', 'system', 'user']),
})

export const aiTextJobInputSchema = z.object({
  messages: z.array(aiTextMessageSchema).min(1).max(MAXIMUM_MESSAGE_COUNT),
  parameters: z
    .object({
      maximumTokens: z.number().int().min(1).max(MAXIMUM_TOKENS).optional(),
      temperature: z.number().min(0).max(2).optional(),
      topP: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

export type AiTextJobInput = z.infer<typeof aiTextJobInputSchema>

export const aiJobErrorResponseSchema = z.object({
  error: z.string(),
  job: aiJobSchema.optional(),
})

export type AiJobErrorResponse = z.infer<typeof aiJobErrorResponseSchema>
