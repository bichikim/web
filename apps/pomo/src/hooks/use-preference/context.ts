import {type Accessor, createContext} from 'solid-js'
import type {PreferenceStorage} from './types'

export interface PreferenceSnapshot {
  readonly value: unknown
}

export interface PreferenceErrorContext {
  readonly operation: 'read' | 'write'
  readonly isCurrent: boolean
}

export type PreferenceErrorListener = (error: unknown, context: PreferenceErrorContext) => void

/** Controls whether a provider-owned preference snapshot update writes to storage. */
export interface PreferenceSetValueOptions {
  readonly persist?: boolean
  readonly rollbackOnError?: boolean
}

export interface PreferenceEntry {
  readonly snapshot: Accessor<PreferenceSnapshot | null>
  readonly setValue: (value: unknown, options?: PreferenceSetValueOptions) => void
  readonly subscribeSaves: (listener: () => void) => () => void
  readonly subscribeErrors: (listener: PreferenceErrorListener) => () => void
}

export interface PreferenceContextValue {
  readonly get: (key: string, storage?: PreferenceStorage) => PreferenceEntry
}

export const PreferenceContext = createContext<PreferenceContextValue>()
