import type {PreferenceStorage, PreferenceStorageResult} from 'src/utils/preference-storage'

export interface CreateParsedPreferenceStorageOptions<Value> {
  readonly read: PreferenceStorage['read']
  readonly parse: (value: unknown) => Value | null
  readonly write: (value: Value, key: string) => PreferenceStorageResult<unknown | null>
  readonly invalidMessage: string
  readonly subscribe?: PreferenceStorage['subscribe']
}

/** Validates preference writes while preserving repository results, failures, and subscriptions. */
export const createParsedPreferenceStorage = <Value>(
  options: CreateParsedPreferenceStorageOptions<Value>,
): PreferenceStorage => ({
  read: options.read,
  subscribe: options.subscribe,
  write(key, value) {
    const parsed = options.parse(value)
    return parsed === null ? new Error(options.invalidMessage) : options.write(parsed, key)
  },
})
