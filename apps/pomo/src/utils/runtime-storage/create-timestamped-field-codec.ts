import {z} from 'zod'

export type StoredTimestampedField<Field extends string, Value> = Readonly<Record<Field, Value>> & {
  readonly savedAt: number
}

/** Parses timestamped fields and migrates legacy bare values with timestamp zero. */
export const createTimestampedFieldCodec = <Field extends string, Value>(
  field: Field,
  valueSchema: z.ZodType<Value>,
) => {
  const storedSchema = z.object({[field]: valueSchema, savedAt: z.number().finite().nonnegative()})
  const parseValue = (value: unknown): Value | null => {
    const parsed = valueSchema.safeParse(value)
    return parsed.success ? parsed.data : null
  }
  const toStored = (value: Value, savedAt: number): StoredTimestampedField<Field, Value> =>
    ({[field]: value, savedAt}) as StoredTimestampedField<Field, Value>
  const parseStored = (value: unknown): StoredTimestampedField<Field, Value> | null => {
    const parsed = storedSchema.safeParse(value)
    if (parsed.success) {
      return parsed.data as StoredTimestampedField<Field, Value>
    }
    const legacy = parseValue(value)
    return legacy === null ? null : toStored(legacy, 0)
  }
  return {
    parseStored,
    parseValue,
    toStored,
    toValue: (stored: StoredTimestampedField<Field, Value>): Value => stored[field],
  }
}
