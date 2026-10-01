import {hasNativeStorageBridge} from './has-native-storage-bridge'
import {readTossStorageJson} from './read-toss-storage-json'
import {readWebStorageJson} from './read-web-storage-json'
import {removeWebStorageItem} from './remove-web-storage-item'
import {writeTossStorageJson} from './write-toss-storage-json'
import {writeWebStorageJson} from './write-web-storage-json'

export interface TossWebStorageAdapterOptions {
  readonly writeWebMode?: 'throw' | 'return-error'
}

/** Assembles runtime storage operations without binding a preference key. */
export const createTossWebStorageAdapter = (options: TossWebStorageAdapterOptions = {}) => ({
  readToss: (key: string) => readTossStorageJson(key, (value) => value),
  readWeb: (key: string) => readWebStorageJson(key, (value) => value),
  removeWeb: removeWebStorageItem,
  usesTossStorage: hasNativeStorageBridge,
  writeToss: writeTossStorageJson,
  writeWeb: (key: string, value: unknown): unknown | null => {
    const error = writeWebStorageJson(key, value)
    if (error !== null && options.writeWebMode !== 'return-error') {
      throw error
    }
    return error
  },
})
