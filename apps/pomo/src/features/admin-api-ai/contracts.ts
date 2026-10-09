import {z} from 'zod'

export const MAXIMUM_API_AI_ROUTES = 5
export const MAXIMUM_API_AI_MODEL_LENGTH = 256
export const MAXIMUM_API_AI_MODEL_LABEL = 100
export const MAXIMUM_API_AI_MODELS = 200
const MAXIMUM_REVISION = 2_147_483_646

export const apiAiRouteSchema = z
  .object({
    model: z.string().trim().min(1).max(MAXIMUM_API_AI_MODEL_LENGTH),
    providerId: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/u),
  })
  .strict()
export const apiAiRouteListSchema = z
  .array(apiAiRouteSchema)
  .min(1)
  .refine(
    (routes) =>
      new Set(routes.map((route) => `${route.providerId}:${route.model}`)).size === routes.length,
    'The same provider and model cannot appear twice',
  )
export const apiAiRoutesSchema = apiAiRouteListSchema.max(MAXIMUM_API_AI_ROUTES)
export const apiAiModelSchema = apiAiRouteSchema.extend({
  label: z.string().trim().max(MAXIMUM_API_AI_MODEL_LABEL).default(''),
})
export const apiAiCatalogSchema = z
  .array(apiAiModelSchema)
  .max(MAXIMUM_API_AI_MODELS)
  .refine(
    (entries) =>
      new Set(entries.map((entry) => `${entry.providerId}:${entry.model}`)).size === entries.length,
    'The same provider model cannot be registered twice',
  )
export const apiAiRoutingSchema = z.object({
  catalog: apiAiCatalogSchema.optional(),
  routes: apiAiRoutesSchema,
})
export const apiAiRoutingUpdateSchema = apiAiRoutingSchema
  .omit({catalog: true})
  .extend({
    revision: z.number().int().min(0).max(MAXIMUM_REVISION),
  })
  .strict()
export const apiAiProviderOptionSchema = z.object({
  id: z.string(),
  models: z.object({'cloud-text': z.string().optional(), history: z.string().optional()}),
  protocol: z.enum(['openai-responses-background', 'openrouter-responses-queue']),
})
export const adminApiAiPageSchema = apiAiRoutingUpdateSchema.extend({
  catalog: z.array(apiAiModelSchema.extend({removable: z.boolean()})).default([]),
  providers: z.array(apiAiProviderOptionSchema),
  routes: apiAiRouteListSchema,
  source: z.enum(['environment', 'admin']),
})
export const apiAiCatalogUpdateSchema = z
  .object({
    entry: apiAiModelSchema,
    operation: z.enum(['register', 'remove']),
    revision: z.number().int().min(0).max(MAXIMUM_REVISION),
  })
  .strict()
export const apiAiModelTestSchema = apiAiRouteSchema
export const apiAiModelTestResultSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('success'),
    modelId: z.string(),
    text: z.string().min(1),
    tokenCount: z.number().int().nonnegative().nullable(),
  }),
  z.object({
    details: z.string().nullable(),
    kind: z.literal('failure'),
    message: z.string(),
    retryAfter: z.string().nullable(),
    status: z.number().int().nullable(),
  }),
])
export type ApiAiModel = z.infer<typeof apiAiModelSchema>
export type ApiAiCatalogUpdate = z.infer<typeof apiAiCatalogUpdateSchema>
export type ApiAiModelTestResult = z.infer<typeof apiAiModelTestResultSchema>
export type ApiAiRoute = z.infer<typeof apiAiRouteSchema>
export type ApiAiRouting = z.infer<typeof apiAiRoutingSchema>
export type ApiAiRoutingUpdate = z.infer<typeof apiAiRoutingUpdateSchema>
export type AdminApiAiPage = z.infer<typeof adminApiAiPageSchema>
export type ApiAiProviderOption = z.infer<typeof apiAiProviderOptionSchema>
