import type {ParseStoredValue} from './types'

/** Parses one JSON storage value and normalizes missing, malformed, or invalid data to null. */
export const parseStorageJson = <Value>(
  storedValue: string | null,
  parseValue: ParseStoredValue<Value>,
): Value | null => {
  if (storedValue === null) {
    return null
  }

  try {
    return parseValue(JSON.parse(storedValue) as unknown)
  } catch {
    return null
  }
}
