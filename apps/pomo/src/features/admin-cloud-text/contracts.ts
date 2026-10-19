import {z} from 'zod'
import {cloudTextUsageSchema} from '../cloud-text/contracts'

export const MAXIMUM_CLOUD_TEXT_DAILY_LIMIT = 10_000
export const adminCloudTextQuerySchema = z.object({
  cursor: z.uuid().optional(),
  userId: z.uuid().optional(),
})
export const cloudTextLimitUpdateSchema = z.object({
  dailyLimit: z.union([
    z.number().int().min(0).max(MAXIMUM_CLOUD_TEXT_DAILY_LIMIT),
    z.literal('unlimited'),
    z.null(),
  ]),
})
export const adminCloudTextUserSchema = z.object({
  createdAt: z.iso.datetime(),
  dailyLimitOverride: z.union([z.number().int().nonnegative(), z.literal('unlimited'), z.null()]),
  id: z.uuid(),
  providers: z.array(z.enum(['neon', 'toss'])),
  usage: cloudTextUsageSchema,
})
export const adminCloudTextPageSchema = z.object({
  nextCursor: z.uuid().nullable(),
  users: z.array(adminCloudTextUserSchema),
})
export type AdminCloudTextUser = z.infer<typeof adminCloudTextUserSchema>
export type AdminCloudTextPage = z.infer<typeof adminCloudTextPageSchema>
export type AdminCloudTextQuery = z.infer<typeof adminCloudTextQuerySchema>
export type CloudTextLimitUpdate = z.infer<typeof cloudTextLimitUpdateSchema>
