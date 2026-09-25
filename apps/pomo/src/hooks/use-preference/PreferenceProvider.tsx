import {batch, type JSX, onCleanup, onMount, untrack} from 'solid-js'
import {type PreferenceStorage, webLocalStorage} from 'src/utils/preference-storage'
import {PreferenceContext, type PreferenceEntry} from './context'
import {createPreferenceEntry, type StoredPreference} from './create-preference-entry'

export interface PreferenceProviderProps {
  readonly children?: JSX.Element
  /** Default storage is selected once for the provider lifetime. */
  readonly storage?: PreferenceStorage
  readonly onError?: (error: unknown) => void
}

/** Shares preferences by key and owns subscriptions to their selected storage adapters. */
export const PreferenceProvider = (props: PreferenceProviderProps) => {
  const storage = untrack(() => props.storage ?? webLocalStorage)
  const entries = new Map<string, StoredPreference>()
  const sources = new Map<string, PreferenceStorage>()
  const subscriptions = new Map<PreferenceStorage, VoidFunction | undefined>()
  let mounted = false
  let disposed = false
  const onError = (error: unknown) => (props.onError ?? globalThis.reportError)(error)
  const subscribe = (source: PreferenceStorage) => {
    if (subscriptions.has(source)) {
      return
    }
    const handleChange = (key: string | null) => {
      if (disposed) {
        return
      }
      batch(() =>
        entries.forEach((entry, entryKey) => {
          if (sources.get(entryKey) === source && (key === null || key === entryKey)) {
            entry.restore()
          }
        }),
      )
    }
    try {
      subscriptions.set(source, source.subscribe?.(handleChange))
    } catch (error: unknown) {
      onError(error)
    }
  }
  const get = (key: string, adapter?: PreferenceStorage): PreferenceEntry => {
    const existing = entries.get(key)
    if (existing !== undefined) {
      return existing
    }
    const source = adapter ?? storage
    const entry = createPreferenceEntry({isActive: () => !disposed, key, onError, storage: source})
    entries.set(key, entry)
    sources.set(key, source)
    if (mounted) {
      onMount(() => {
        subscribe(source)
        entry.restore()
      })
    }
    return entry
  }
  onCleanup(() => {
    disposed = true
    subscriptions.forEach((unsubscribe) => unsubscribe?.())
  })
  onMount(() => {
    mounted = true
    if (sources.size === 0) {
      subscribe(storage)
    }
    sources.forEach(subscribe)
    batch(() => entries.forEach((entry) => entry.restore()))
  })
  return <PreferenceContext.Provider value={{get}}>{props.children}</PreferenceContext.Provider>
}
