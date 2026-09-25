import {createWebStorageDriver} from './create-web-storage-driver'

/** Removes one browser storage item and returns the platform error on failure. */
export const removeWebStorageItem = (key: string): unknown | null => {
  try {
    createWebStorageDriver().removeItem(key)
    return null
  } catch (error: unknown) {
    return error
  }
}
