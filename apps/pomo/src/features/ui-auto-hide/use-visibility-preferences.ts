import {createSignal, onCleanup, onMount} from 'solid-js'
import {z} from 'zod'
import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

const MIN_SECONDS = 5
const MAX_SECONDS = 3600
const STORAGE_KEY = 'pomo:ui-auto-hide:v1'
const preferencesSchema = z.object({
  enabled: z.boolean(),
  seconds: z.number().int().min(MIN_SECONDS).max(MAX_SECONDS),
})
const parsePreferences = (value: unknown) => {
  const result = preferencesSchema.safeParse(value)
  return result.success ? result.data : null
}
const nativeWriter = createSerialNativeStorageWriter()

export const useVisibilityPreferences = () => {
  const [preferences, setPreferences] = createSignal({enabled: false, seconds: 30})
  let edited = false
  const persist = () => {
    edited = true
    const snapshot = preferences()
    const error = writeWebStorageJson(STORAGE_KEY, snapshot)
    if (error !== null) {
      globalThis.reportError(error)
    }
    if (hasNativeStorageBridge()) {
      nativeWriter.write(STORAGE_KEY, snapshot).then((failure) => {
        if (failure !== null) {
          globalThis.reportError(failure)
        }
      })
    }
  }
  const onEnabledChange = (enabled: boolean) => {
    setPreferences((value) => ({...value, enabled}))
    persist()
  }
  const onSecondsChange = (seconds: number) => {
    if (!Number.isInteger(seconds) || seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
      return
    }
    setPreferences((value) => ({...value, seconds}))
    persist()
  }
  onMount(() => {
    let disposed = false
    const stored = readWebStorageJson(STORAGE_KEY, parsePreferences)
    if (stored !== null) {
      setPreferences(stored)
    }
    if (hasNativeStorageBridge()) {
      readNativeStorageJson(STORAGE_KEY, parsePreferences)
        .then((value) => {
          if (!disposed && !edited && value !== null) {
            setPreferences(value)
          }
        })
        .catch(globalThis.reportError)
    }
    onCleanup(() => {
      disposed = true
    })
  })
  return {
    onEnabledChange,
    onSecondsChange,
    preferences,
  }
}
