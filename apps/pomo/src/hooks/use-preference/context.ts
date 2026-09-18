import {type Accessor, createContext} from 'solid-js'
import type {PreferenceStorage} from 'src/utils/preference-storage'

export interface PreferenceSnapshot {
  readonly value: unknown
}

export interface PreferenceEntry {
  readonly snapshot: Accessor<PreferenceSnapshot | null>
  readonly setValue: (value: unknown) => void
  readonly subscribeSaves: (listener: () => void) => () => void
  readonly subscribeErrors: (listener: (error: unknown) => void) => () => void
}

export interface PreferenceContextValue {
  readonly get: (key: string, storage?: PreferenceStorage) => PreferenceEntry
}

export const PreferenceContext = createContext<PreferenceContextValue>()
