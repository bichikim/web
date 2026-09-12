import {loadTossStorage} from './load-toss-storage'
import {parseStorageJson} from './parse-storage-json'
import type {ParseStoredValue} from './types'

/** Loads Apps in Toss storage only when a Toss storage read is actually required. */
export const readTossStorageJson = async <Value>(
  key: string,
  parseValue: ParseStoredValue<Value>,
): Promise<Value | null> => {
  const storage = await loadTossStorage()
  return parseStorageJson(await storage.getItem(key), parseValue)
}
