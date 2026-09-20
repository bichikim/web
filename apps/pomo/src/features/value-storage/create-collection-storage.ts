import {createJsonCodec} from './create-json-codec'
import {createValueStorage} from './create-value-storage'
import type {StringStorage} from './types'

export interface CreateCollectionStorageOptions<Value> {
  readonly key: string
  readonly storage: () => StringStorage
  readonly parse: (value: unknown) => ReadonlyArray<Value>
  readonly onChange: () => void
  readonly readFailureMessage: string
}

export interface CollectionStorage<Value> {
  readonly read: () => ReadonlyArray<Value>
  readonly write: (values: ReadonlyArray<Value>) => void
}

/** Restores collections with an empty fallback and announces only successfully persisted writes. */
export const createCollectionStorage = <Value>(
  options: CreateCollectionStorageOptions<Value>,
): CollectionStorage<Value> => {
  const value = createValueStorage({
    ...createJsonCodec(options.parse),
    key: options.key,
    storage: options.storage,
  })
  return {
    read() {
      try {
        return value.read() ?? []
      } catch (error: unknown) {
        console.warn(options.readFailureMessage, error)
        return []
      }
    },
    write(values) {
      const parsed = options.parse(values)
      value.write(parsed)
      options.onChange()
    },
  }
}
