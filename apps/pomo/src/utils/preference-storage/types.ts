export type PreferenceStorageResult<Value> = Value | Promise<Value>

/** Stores decoded preferences; writes return null or undefined on success or an error on failure. */
export interface PreferenceStorage {
  readonly read: (key: string) => PreferenceStorageResult<unknown>
  readonly write: (key: string, value: unknown) => PreferenceStorageResult<unknown | null>
  /** Reports external changes; null invalidates every key. Returns synchronous unsubscribe. */
  readonly subscribe?: (onChange: (key: string | null) => void) => () => void
}
