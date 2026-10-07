import {createTossWebStorageAdapter} from './create-toss-web-storage-adapter'
import {readTossStorageJson} from './read-toss-storage-json'
import {readWebStorageJson} from './read-web-storage-json'

export interface BoundTossWebStorageAdapterOptions<Value> {
  readonly key: string
  readonly parse: (value: unknown) => Value | null
}

/** Binds both runtime stores to one key and domain parser. */
export const createBoundTossWebStorageAdapter = <Value>(
  options: BoundTossWebStorageAdapterOptions<Value>,
) => {
  const adapter = createTossWebStorageAdapter({writeWebMode: 'return-error'})
  return {
    isNative: adapter.usesTossStorage,
    readToss: () => readTossStorageJson(options.key, options.parse),
    readWeb: () => readWebStorageJson(options.key, options.parse),
    usesTossStorage: adapter.usesTossStorage,
    writeToss: (value: Value) => adapter.writeToss(options.key, value),
    writeWeb: (value: Value) => adapter.writeWeb(options.key, value),
  }
}
