import {z} from 'zod'

/** Schema for a required environment string that treats whitespace as missing. */
export const requiredStringSchema = (name: string) =>
  z.string(`${name} is not set`).trim().min(1, `${name} is not set`)

/** Schema for an optional environment string that treats whitespace as omitted. */
export const optionalStringSchema = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  })

/** Schema for an optional environment string that falls back to a default. */
export const defaultedStringSchema = (defaultValue: string) =>
  optionalStringSchema.pipe(z.string().default(defaultValue))
