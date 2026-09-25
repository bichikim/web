import {createStorage} from 'unstorage'
import {createTossStorageDriver} from './create-toss-storage-driver'

export interface TossRuntimeStorage {
  readonly read: (key: string) => Promise<string | null>
  readonly write: (key: string, serializedValue: string) => Promise<void>
}

const storage = createStorage({driver: createTossStorageDriver()})
const tossRuntimeStorage: TossRuntimeStorage = {
  read: (key) => storage.getItem<string>(encodeURIComponent(key)),
  write: (key, serializedValue) => storage.setItem(encodeURIComponent(key), serializedValue),
}

export const getTossRuntimeStorage = (): TossRuntimeStorage => tossRuntimeStorage
