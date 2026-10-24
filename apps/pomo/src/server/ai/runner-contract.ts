import {z} from 'zod'

import {createAiArtifactIntermediateObjectKeyPrefix} from './artifacts.ts'
import {runnerCapabilityFor} from './contracts.ts'

export const AI_RUNNER_PROTOCOL_VERSION = 1
export const MAXIMUM_ERROR_CODE_LENGTH = 64
export const MAXIMUM_ERROR_MESSAGE_LENGTH = 1000
const MAXIMUM_JOB_ID_LENGTH = 255
const MAXIMUM_MODEL_ID_LENGTH = 128
const MAXIMUM_PROGRESS = 100

const runnerArtifactLocationSchema = z.object({
  intermediateObjectKeyPrefix: z.string().regex(/^ai\/intermediate\/[\da-f-]{36}$/iu),
  objectKeyPrefix: z.string().regex(/^ai\/jobs\/[\da-f-]{36}\/temporary$/iu),
})

export const aiRunnerJobStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
])

export const aiRunnerJobRequestSchema = z.object({
  artifact: runnerArtifactLocationSchema.optional(),
  capability: z.enum(['image', 'sound', 'speech_to_text', 'text', 'text_to_speech']),
  input: z.record(z.string(), z.unknown()),
  jobId: z.string().uuid(),
  modelId: z.string().min(1).max(MAXIMUM_MODEL_ID_LENGTH),
  protocolVersion: z.literal(AI_RUNNER_PROTOCOL_VERSION),
})

export const aiRunnerSubmitResponseSchema = z.object({
  jobId: z.string().min(1).max(MAXIMUM_JOB_ID_LENGTH),
})

export const aiRunnerJobStatusResponseSchema = z.object({
  error: z
    .object({
      code: z.string().min(1).max(MAXIMUM_ERROR_CODE_LENGTH),
      message: z.string().max(MAXIMUM_ERROR_MESSAGE_LENGTH),
    })
    .nullable()
    .optional(),
  jobId: z.string().min(1).max(MAXIMUM_JOB_ID_LENGTH),
  metrics: z
    .object({
      inferenceMs: z.number().int().nonnegative().optional(),
      queueMs: z.number().int().nonnegative().optional(),
    })
    .nullable()
    .optional(),
  progress: z.number().int().min(0).max(MAXIMUM_PROGRESS),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  status: aiRunnerJobStatusSchema,
})

export type AiRunnerJobRequest = z.infer<typeof aiRunnerJobRequestSchema>
export type AiRunnerJobStatus = z.infer<typeof aiRunnerJobStatusSchema>
export type AiRunnerJobStatusResponse = z.infer<typeof aiRunnerJobStatusResponseSchema>

export const createAiRunnerJobRequest = (input: {
  readonly capability: Parameters<typeof runnerCapabilityFor>[0]
  readonly input: Record<string, unknown>
  readonly jobId: string
  readonly modelId: string
}): AiRunnerJobRequest =>
  aiRunnerJobRequestSchema.parse({
    artifact:
      input.capability === 'text' || input.capability === 'speech-to-text'
        ? undefined
        : {
            intermediateObjectKeyPrefix: createAiArtifactIntermediateObjectKeyPrefix(input.jobId),
            objectKeyPrefix: `ai/jobs/${input.jobId}/temporary`,
          },
    capability: runnerCapabilityFor(input.capability),
    input: input.input,
    jobId: input.jobId,
    modelId: input.modelId,
    protocolVersion: AI_RUNNER_PROTOCOL_VERSION,
  })
