import {getTossRuntimeStorage} from './get-toss-runtime-storage'
import {parseStorageJson} from './parse-storage-json'
import type {ParseStoredValue} from './types'

/** 토스 저장소에서 실제로 읽어야 할 때만 Apps in Toss 저장소를 불러온다. */
export const readTossStorageJson = async <Value>(
  key: string,
  parseValue: ParseStoredValue<Value>,
): Promise<Value | null> => {
  const storedValue = await getTossRuntimeStorage().read(key)
  return parseStorageJson(storedValue, parseValue)
}
