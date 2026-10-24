import type {ValueCodec} from './types'

/** Validates decoded JSON and serializes values without applying read-time transformations. */
export const createJsonCodec = <Value>(
  parse: (value: unknown) => Value | null,
): ValueCodec<Value> => ({
  decode: (stored) => parse(JSON.parse(stored) as unknown),
  encode(value) {
    const stored = JSON.stringify(value)
    if (stored === undefined) {
      throw new TypeError('Value cannot be represented as JSON.')
    }
    return stored
  },
})
