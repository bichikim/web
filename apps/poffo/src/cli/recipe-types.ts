import {z} from 'zod'
import {patchSchema} from '../backend/command-schemas'
import {renderInputSchema} from '../backend/render-types'

const pathSchema = z.string().min(1)
export const recipeSchema = z.object({
  input: pathSchema,
  output: z.object({
    format: z.enum(['poffo', 'json']).default('poffo'),
    overwrite: z.boolean().default(false),
    path: pathSchema,
  }),
  steps: z.array(
    z.discriminatedUnion('type', [
      z.object({patch: patchSchema, title: z.string().optional(), type: z.literal('patch')}),
      renderInputSchema.omit({expectedRevision: true}).extend({type: z.literal('render')}),
    ]),
  ),
  version: z.literal(1),
})

const artifactSchema = z.object({hash: z.string(), path: pathSchema})
export const recipeReportSchema = z.object({
  artifacts: z.array(artifactSchema),
  checkpoint: artifactSchema,
  complete: z.boolean(),
  completed: z.number().int().nonnegative(),
  engineHash: z.string(),
  error: z.string().optional(),
  inputHash: z.string(),
  output: artifactSchema.optional(),
  recipeHash: z.string(),
  version: z.literal(1),
})
export type Recipe = z.output<typeof recipeSchema>
export type RecipeReport = z.output<typeof recipeReportSchema>
