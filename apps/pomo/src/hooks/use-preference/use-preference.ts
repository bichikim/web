import {type Accessor, createMemo, onCleanup, untrack, useContext} from 'solid-js'
import {PreferenceContext, type PreferenceSetValueOptions} from './context'
import type {PreferenceStorage} from 'src/utils/preference-storage'

export interface PreferenceOptions<Value> {
  /** Selected by the first consumer of this key for the provider lifetime. */
  readonly storage?: PreferenceStorage
  /** Called after successful writes while this consumer remains mounted. */
  readonly onSaved?: () => void
  readonly onError?: (error: unknown) => void
  readonly key: string
  readonly defaultValue: Value
  readonly parse: (value: unknown) => Value | null
}

export type Preference<Value> = readonly [
  value: Accessor<Value | null>,
  setValue: (value: Value | null, options?: PreferenceSetValueOptions) => void,
]

/** Reads a provider-owned preference, applying its default to absent or null values. */
export const usePreference = <Value>(options: PreferenceOptions<Value>): Preference<Value> => {
  const preferences = useContext(PreferenceContext)
  if (preferences === undefined) {
    throw new Error('PreferenceProvider is required')
  }
  const entry = preferences.get(options.key, options.storage)
  if (options.onError !== undefined) {
    onCleanup(entry.subscribeErrors((error) => untrack(() => options.onError?.(error))))
  }
  if (options.onSaved !== undefined) {
    onCleanup(entry.subscribeSaves(() => untrack(() => options.onSaved?.())))
  }
  const value = createMemo(() => {
    const snapshot = entry.snapshot()
    return snapshot === null
      ? null
      : untrack(() => options.parse(snapshot.value) ?? options.defaultValue)
  })
  return [value, entry.setValue]
}
