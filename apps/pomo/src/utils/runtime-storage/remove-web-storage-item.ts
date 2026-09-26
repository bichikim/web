import {getWebRuntimeStorage} from './get-web-runtime-storage'

/** Removes one browser storage item and returns the platform error on failure. */
export const removeWebStorageItem = (key: string): unknown | null => {
  try {
    getWebRuntimeStorage().removeItem(key)
    return null
  } catch (error: unknown) {
    return error
  }
}
