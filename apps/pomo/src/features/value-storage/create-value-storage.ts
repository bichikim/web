import type {CreateValueStorageOptions, ValueStorage} from './types'

/** Stores a decoded value at one key, propagating codec and storage failures. */
export const createValueStorage = <Value>(
  options: CreateValueStorageOptions<Value>,
): ValueStorage<Value> => ({
  read() {
    const stored = options.storage().getItem(options.key)
    return stored === null ? null : options.decode(stored)
  },
  write(value) {
    options.storage().setItem(options.key, options.encode(value))
  },
})
