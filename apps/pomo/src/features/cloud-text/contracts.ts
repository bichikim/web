import {z} from 'zod'

export const CLOUD_TEXT_DAILY_LIMIT = 3
export const CLOUD_TEXT_MODEL = 'gpt-6-luna'
const MAXIMUM_MESSAGES = 64
const MAXIMUM_MESSAGE_LENGTH = 12_000
const MAXIMUM_INPUT_LENGTH = 48_000
const MAXIMUM_OUTPUT_TOKENS = 4096

const cloudTextUsageBase = z.object({
  day: z.iso.date(),
  resetsAt: z.iso.datetime(),
  used: z.number().int().nonnegative(),
})
export const cloudTextUsageSchema = z.union([
  cloudTextUsageBase.extend({
    limit: z.number().int().nonnegative(),
    remaining: z.number().int().nonnegative(),
  }),
  cloudTextUsageBase.extend({limit: z.null(), remaining: z.null()}),
])
export type CloudTextUsage = z.infer<typeof cloudTextUsageSchema>

export const cloudTextRequestSchema = z.object({
  maximumTokens: z.number().int().min(1).max(MAXIMUM_OUTPUT_TOKENS),
  messages: z
    .array(
      z.object({
        content: z.string().min(1).max(MAXIMUM_MESSAGE_LENGTH),
        role: z.enum(['assistant', 'system', 'user']),
      }),
    )
    .min(1)
    .max(MAXIMUM_MESSAGES)
    .refine(
      (messages) =>
        messages.reduce((length, message) => length + message.content.length, 0) <=
        MAXIMUM_INPUT_LENGTH,
    ),
  requestId: z.uuid(),
})
export type CloudTextRequest = z.infer<typeof cloudTextRequestSchema>

export const cloudTextResponseSchema = z.object({
  text: z.string().min(1),
  tokenCount: z.number().int().nonnegative(),
  usage: cloudTextUsageSchema,
})
export type CloudTextResponse = z.infer<typeof cloudTextResponseSchema>

export const cloudTextAcceptedSchema = z.object({requestId: z.uuid(), usage: cloudTextUsageSchema})
export const cloudTextJobEventSchema = z.discriminatedUnion('kind', [
  cloudTextResponseSchema.extend({kind: z.literal('complete')}),
  z.object({
    kind: z.literal('pending'),
    requestId: z.uuid(),
    status: z.enum(['queued', 'submitting', 'running', 'recovery_pending']),
    usage: cloudTextUsageSchema,
  }),
  z.object({
    kind: z.enum(['failed', 'cancelled']),
    requestId: z.uuid(),
    usage: cloudTextUsageSchema,
  }),
])
