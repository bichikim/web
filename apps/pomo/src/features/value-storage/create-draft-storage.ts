import {createValueStorage} from './create-value-storage'
import type {CreateValueStorageOptions, RemovableStringStorage, ValueStorage} from './types'

export interface DraftFailureMessages {
  readonly read: string
  readonly write: string
  readonly delete: string
}

export interface CreateDraftStorageOptions<Value> extends CreateValueStorageOptions<Value> {
  readonly storage: () => RemovableStringStorage
  readonly messages: DraftFailureMessages
}

export interface DraftStorage<Value> extends ValueStorage<Value> {
  readonly delete: () => void
}

/** Persists disposable drafts, reporting failed operations without interrupting the editor. */
export const createDraftStorage = <Value>(
  options: CreateDraftStorageOptions<Value>,
): DraftStorage<Value> => {
  const value = createValueStorage(options)
  return {
    delete() {
      try {
        options.storage().removeItem(options.key)
      } catch (error: unknown) {
        console.warn(options.messages.delete, error)
      }
    },
    read() {
      try {
        return value.read()
      } catch (error: unknown) {
        console.warn(options.messages.read, error)
        return null
      }
    },
    write(draft) {
      try {
        value.write(draft)
      } catch (error: unknown) {
        console.warn(options.messages.write, error)
      }
    },
  }
}
