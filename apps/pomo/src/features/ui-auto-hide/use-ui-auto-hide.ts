import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {z} from 'zod'
import {useEvent} from '@winter-love/solid-use/event'
import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

const MIN_SECONDS = 5
const MAX_SECONDS = 3600
const MILLISECONDS_PER_SECOND = 1000
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

/** Owns persisted UI visibility preferences and the inactivity timer. */
export const useUiAutoHide = () => {
  const [preferences, setPreferences] = createSignal({enabled: false, seconds: 30})
  const [hidden, setHidden] = createSignal(false)
  const [revision, setRevision] = createSignal(0)
  let edited = false
  const wake = () => {
    setHidden(false)
    setRevision((value) => value + 1)
  }
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
    wake()
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
    for (const event of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll'] as const) {
      useEvent(window, event, wake, {capture: true, passive: true})
    }
    useEvent(document, 'visibilitychange', wake)
    createEffect(() => {
      const current = preferences()
      revision()
      setHidden(false)
      if (!current.enabled || document.visibilityState === 'hidden') {
        return
      }
      const expire = () => {
        const dialogs = document.querySelectorAll(
          '[role="dialog"], dialog[open], [role="alertdialog"]',
        )
        if (Array.from(dialogs).some((dialog) => dialog.getClientRects().length > 0)) {
          wake()
          return
        }
        setHidden(true)
      }
      const timeout = globalThis.setTimeout(expire, current.seconds * MILLISECONDS_PER_SECOND)
      onCleanup(() => globalThis.clearTimeout(timeout))
    })
    onCleanup(() => {
      disposed = true
    })
  })
  return {
    enabled: () => preferences().enabled,
    hidden,
    onEnabledChange,
    onSecondsChange,
    seconds: () => preferences().seconds,
  }
}
