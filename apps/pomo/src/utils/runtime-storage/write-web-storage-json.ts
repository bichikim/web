import {getWebRuntimeStorage} from './get-web-runtime-storage'

/** 브라우저 저장소에 JSON 쓰기를 시도하고 실패하면 플랫폼 오류를 반환한다. */
export const writeWebStorageJson = (key: string, value: unknown): unknown | null => {
  try {
    getWebRuntimeStorage().setItem(key, JSON.stringify(value))
    return null
  } catch (error: unknown) {
    return error
  }
}
