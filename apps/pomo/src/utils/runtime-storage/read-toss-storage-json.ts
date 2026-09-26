import {getTossRuntimeStorage} from './get-toss-runtime-storage'
import {parseStorageJson} from './parse-storage-json'
import type {ParseStoredValue} from './types'

/** Loads Apps in Toss storage only when a Toss storage read is actually required. */
export const readTossStorageJson = async <Value>(
  key: string,
  parseValue: ParseStoredValue<Value>,
): Promise<Value | null> => {
  const storedValue = await getTossRuntimeStorage().read(key)
  return parseStorageJson(storedValue, parseValue)
}
