import type {ParseStoredValue} from './types'

/** Removes one leading BOM, parses JSON, and normalizes missing, malformed, or invalid data to null. */
export const parseStorageJson = <Value>(
  storedValue: string | null,
  parseValue: ParseStoredValue<Value>,
): Value | null => {
  if (storedValue === null) {
    return null
  }

  try {
    const json = storedValue.replace(/^\uFEFF/u, '')
    return parseValue(JSON.parse(json) as unknown)
  } catch {
    return null
  }
}
