/* oxlint-disable eslint-js/camelcase -- These fields follow the Codex configuration format. */
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {parse} from 'smol-toml'
import {z} from 'zod'
import type {MarketplaceSource} from './types'

interface ReadMarketplaceSourcesOptions {
  readonly home: string
  readonly marketplaces: readonly string[]
}

const sourceSchema = z.discriminatedUnion('source_type', [
  z.object({source: z.string(), source_type: z.literal('local')}),
  z.object({
    ref: z.string().optional(),
    source: z.string(),
    source_type: z.literal('git'),
    sparse_paths: z.array(z.string()).optional(),
  }),
]) satisfies z.ZodType<MarketplaceSource>

/** Reads selected marketplace registrations from one snapshot of the user's Codex configuration. */
export const readMarketplaceSources = async (
  options: ReadMarketplaceSourcesOptions,
): Promise<ReadonlyMap<string, MarketplaceSource>> => {
  const content = await readFile(join(options.home, 'config.toml'), 'utf8').catch(
    (error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return undefined
      }
      throw error
    },
  )
  if (content === undefined) {
    return new Map()
  }
  const configuration = z
    .object({marketplaces: z.record(z.string(), z.unknown()).optional()})
    .parse(parse(content))
  return new Map(
    options.marketplaces.flatMap((name) => {
      const source = configuration.marketplaces?.[name]
      return source === undefined ? [] : [[name, sourceSchema.parse(source)] as const]
    }),
  )
}
