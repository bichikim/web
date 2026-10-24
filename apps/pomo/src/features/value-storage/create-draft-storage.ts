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
  readonly reportError?: (message: string, error: unknown) => void
}

export interface DraftStorage<Value> extends ValueStorage<Value> {
  readonly delete: () => void
}

/** Persists disposable drafts, reporting failed operations without interrupting the editor. */
export const createDraftStorage = <Value>(
  options: CreateDraftStorageOptions<Value>,
): DraftStorage<Value> => {
  const value = createValueStorage(options)
  const reportError = options.reportError ?? console.warn
  return {
    delete() {
      try {
        options.storage().removeItem(options.key)
      } catch (error: unknown) {
        reportError(options.messages.delete, error)
      }
    },
    read() {
      try {
        return value.read()
      } catch (error: unknown) {
        reportError(options.messages.read, error)
        return null
      }
    },
    write(draft) {
      try {
        value.write(draft)
      } catch (error: unknown) {
        reportError(options.messages.write, error)
      }
    },
  }
}
