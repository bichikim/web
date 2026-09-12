import {createSignal, onCleanup, onMount} from 'solid-js'
import {readWebStorageJson, writeWebStorageJson} from 'src/features/runtime-storage'

const STORAGE_KEY = 'pomo:feed-auto-prepare:v1'
const CHANGE_EVENT = 'pomo:feed-auto-prepare-change'
const parseEnabled = (value: unknown) => (typeof value === 'boolean' ? value : null)

/** Reads whether newly received feeds should start voice preparation automatically. */
export const readFeedAutoPreparePreference = () =>
  readWebStorageJson(STORAGE_KEY, parseEnabled) ?? true

/** Owns the persisted automatic preparation switch. */
export const useAutoPreparePreference = () => {
  const [enabled, setEnabled] = createSignal(true)
  const [isReady, setIsReady] = createSignal(false)
  const restore = () => setEnabled(readFeedAutoPreparePreference())
  const onEnabledChange = (value: boolean) => {
    setEnabled(value)
    const error = writeWebStorageJson(STORAGE_KEY, value)
    if (error !== null) {
      globalThis.reportError(error)
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, {detail: value}))
  }
  onMount(() => {
    restore()
    setIsReady(true)
    const handleChange = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === 'boolean') {
        setEnabled(event.detail)
      }
    }
    window.addEventListener(CHANGE_EVENT, handleChange)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        restore()
      }
    }
    window.addEventListener('storage', handleStorage)
    onCleanup(() => {
      window.removeEventListener(CHANGE_EVENT, handleChange)
      window.removeEventListener('storage', handleStorage)
    })
  })
  return {enabled, isReady, onEnabledChange}
}
