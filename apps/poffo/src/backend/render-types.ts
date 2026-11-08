import {z} from 'zod'

const MINIMUM_SIZE = 64
const MAXIMUM_SIZE = 4096
const DEFAULT_SIZE = 1024

export const renderInputSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  motionId: z.string().optional(),
  overwrite: z.boolean().default(false),
  parameters: z.record(z.string(), z.number().finite()).optional(),
  path: z.string(),
  size: z.number().int().min(MINIMUM_SIZE).max(MAXIMUM_SIZE).default(DEFAULT_SIZE),
  time: z.number().nonnegative().default(0),
})
export type RenderInput = z.infer<typeof renderInputSchema>

export const renderRequestSchema = z.object({
  id: z.string(),
  input: renderInputSchema,
  kind: z.literal('render'),
})
export type RenderRequest = z.infer<typeof renderRequestSchema>

export const renderResultSchema = z.object({
  error: z.string().optional(),
  id: z.string(),
  result: z
    .object({
      dataUrl: z.string().startsWith('data:image/png;base64,'),
      height: z.number().int().positive(),
      width: z.number().int().positive(),
    })
    .optional(),
})

export interface RenderedImage {
  readonly dataUrl: string
  readonly width: number
  readonly height: number
}
