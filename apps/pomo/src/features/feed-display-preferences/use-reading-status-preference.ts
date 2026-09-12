import {createSignal, onCleanup, onMount} from 'solid-js'
import {readWebStorageJson, writeWebStorageJson} from 'src/utils/runtime-storage'

const STORAGE_KEY = 'pomo:feed-reading-status-visible:v1'
const CHANGE_EVENT = 'pomo:feed-reading-status-change'
const parseVisible = (value: unknown) => (typeof value === 'boolean' ? value : null)

/** Shares the persisted feed progress visibility preference across mounted consumers. */
export const useReadingStatusPreference = () => {
  const [visible, setVisible] = createSignal(true)
  const [isReady, setIsReady] = createSignal(false)
  const restore = () => setVisible(readWebStorageJson(STORAGE_KEY, parseVisible) ?? true)
  const onVisibleChange = (value: boolean) => {
    setVisible(value)
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
        setVisible(event.detail)
      }
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        restore()
      }
    }
    window.addEventListener(CHANGE_EVENT, handleChange)
    window.addEventListener('storage', handleStorage)
    onCleanup(() => {
      window.removeEventListener(CHANGE_EVENT, handleChange)
      window.removeEventListener('storage', handleStorage)
    })
  })
  return {isReady, onVisibleChange, visible}
}
