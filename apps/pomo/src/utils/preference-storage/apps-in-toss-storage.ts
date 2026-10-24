import {readTossStorageJson, writeTossStorageJson} from 'src/utils/runtime-storage'
import type {PreferenceStorage} from './types'

export const appsInTossStorage: PreferenceStorage = {
  read: (key) => readTossStorageJson(key, (value) => value),
  async write(key, value) {
    try {
      await writeTossStorageJson(key, value)
      return null
    } catch (error: unknown) {
      return error
    }
  },
}
