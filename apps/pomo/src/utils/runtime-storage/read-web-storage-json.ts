import {getWebRuntimeStorage} from './get-web-runtime-storage'
import {parseStorageJson} from './parse-storage-json'
import type {ParseStoredValue} from './types'

/** 브라우저 저장소 읽기와 파싱을 시도하고 플랫폼 오류를 외부로 전파하지 않는다. */
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
