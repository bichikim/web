import {z} from 'zod'

import {optionalStringSchema} from './required'

/** Schema for an environment enum that falls back to a default. */
export const allowedStringSchema = <const Value extends string>(
  name: string,
  values: readonly [Value, ...Value[]],
  defaultValue: Value,
) =>
  optionalStringSchema.pipe(
    z.enum(values, `${name} must be one of: ${values.join(', ')}`).default(defaultValue),
  )
