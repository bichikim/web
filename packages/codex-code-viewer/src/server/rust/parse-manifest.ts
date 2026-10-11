import {parse} from 'smol-toml'
import {z} from 'zod'

const editionSchema = z.enum(['2015', '2018', '2021', '2024'])
const inheritedSchema = z.object({workspace: z.literal(true)})
const dependencySchema = z.union([
  z.string(),
  z.object({
    optional: z.boolean().optional(),
    package: z.string().optional(),
    path: z.string().optional(),
    workspace: z.boolean().optional(),
  }),
])
const dependenciesSchema = z.record(z.string(), dependencySchema)
const targetSchema = z.object({name: z.string().optional(), path: z.string().optional()})
const manifestSchema = z.object({
  bench: z.array(targetSchema).optional(),
  bin: z.array(targetSchema).optional(),
  dependencies: dependenciesSchema.optional(),
  example: z.array(targetSchema).optional(),
  features: z.record(z.string(), z.array(z.string())).optional(),
  lib: targetSchema.optional(),
  package: z
    .object({
      autobins: z.boolean().optional(),
      autolib: z.boolean().optional(),
      edition: z.union([editionSchema, inheritedSchema]).optional(),
      name: z.string(),
      workspace: z.string().optional(),
    })
    .optional(),
  test: z.array(targetSchema).optional(),
  workspace: z
    .object({
      dependencies: dependenciesSchema.optional(),
      exclude: z.array(z.string()).optional(),
      members: z.array(z.string()).optional(),
      package: z.object({edition: editionSchema.optional()}).optional(),
    })
    .optional(),
})
export type RustManifest = z.infer<typeof manifestSchema>

/** Parses the Cargo fields used to describe local Rust analysis. */
export const parseManifest = (source: string): RustManifest => manifestSchema.parse(parse(source))
