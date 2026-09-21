import {type Accessor, createContext} from 'solid-js'
import type {PreferenceStorage} from 'src/utils/preference-storage'

export interface PreferenceSnapshot {
  readonly value: unknown
}

/** Controls whether a provider-owned preference snapshot update writes to storage. */
export interface PreferenceSetValueOptions {
  readonly persist?: boolean
}

export interface PreferenceEntry {
  readonly snapshot: Accessor<PreferenceSnapshot | null>
  readonly setValue: (value: unknown, options?: PreferenceSetValueOptions) => void
  readonly subscribeSaves: (listener: () => void) => () => void
  readonly subscribeErrors: (listener: (error: unknown) => void) => () => void
}

export interface PreferenceContextValue {
  readonly get: (key: string, storage?: PreferenceStorage) => PreferenceEntry
}

export const PreferenceContext = createContext<PreferenceContextValue>()
