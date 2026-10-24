import {resolve} from 'node:path'
import {z} from 'zod'

interface ResolvePreviousSourceOptions {
  readonly catalog: string | null
  readonly marketplace: string
  readonly plugin: string
  readonly root: string
}

/** Resolves a prior source matching this installer's marketplace, plugin and generated directory shape. */
export const resolvePreviousSource = (
  options: ResolvePreviousSourceOptions,
): string | undefined => {
  if (options.catalog === null) {
    return undefined
  }
  let catalog: unknown
  try {
    catalog = JSON.parse(options.catalog)
  } catch {
    return undefined
  }
  const listing = z
    .object({
      name: z.literal(options.marketplace),
      plugins: z.array(z.object({name: z.string(), source: z.unknown()})),
    })
    .safeParse(catalog)
  if (!listing.success) {
    return undefined
  }
  const entry = listing.data.plugins.find(({name}) => name === options.plugin)
  const source = z
    .object({
      path: z
        .string()
        .regex(
          /^\.\/plugins\/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?-[0-9A-Za-z]{6}$/u,
        ),
      source: z.literal('local'),
    })
    .safeParse(entry?.source)
  return source.success ? resolve(options.root, source.data.path) : undefined
}
