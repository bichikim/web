import {getWebRuntimeStorage} from './get-web-runtime-storage'
import {parseStorageJson} from './parse-storage-json'
import type {ParseStoredValue} from './types'

/** Reads and parses best-effort browser storage without leaking platform errors. */
export const readWebStorageJson = <Value>(
  key: string,
  parseValue: ParseStoredValue<Value>,
): Value | null => {
  try {
    return parseStorageJson(getWebRuntimeStorage().getItem(key), parseValue)
  } catch {
    return null
  }
}
