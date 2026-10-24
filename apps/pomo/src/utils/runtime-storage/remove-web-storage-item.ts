import {getWebRuntimeStorage} from './get-web-runtime-storage'

/** 브라우저 저장소 항목 하나를 삭제하고 실패하면 플랫폼 오류를 반환한다. */
export const removeWebStorageItem = (key: string): unknown | null => {
  try {
    getWebRuntimeStorage().removeItem(key)
    return null
  } catch (error: unknown) {
    return error
  }
}
