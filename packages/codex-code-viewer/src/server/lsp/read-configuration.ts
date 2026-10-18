import {z} from 'zod'

const configurationSchema = z.object({items: z.array(z.object({section: z.string().optional()}))})
/** Returns the requested configured sections in their original request order. */
export const readConfiguration = (
  value: unknown,
  configuration?: Readonly<Record<string, unknown>>,
) =>
  configurationSchema
    .parse(value)
    .items.map((item) =>
      item.section === undefined ? null : (configuration?.[item.section] ?? null),
    )
