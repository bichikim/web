import {createValueStorage} from './create-value-storage'
import type {CreateValueStorageOptions, ValueStorage} from './types'

/** Reads and writes optional persisted values without interrupting the caller on failure. */
export const createBestEffortValueStorage = <Value>(
  options: CreateValueStorageOptions<Value>,
): ValueStorage<Value> => {
  const value = createValueStorage(options)
  return {
    read() {
      try {
        return value.read()
      } catch {
        return null
      }
    },
    write(next) {
      try {
        value.write(next)
      } catch {
        // Optional persistence cannot interrupt the caller.
      }
    },
  }
}
