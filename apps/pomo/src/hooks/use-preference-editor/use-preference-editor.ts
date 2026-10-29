import {type Accessor, createEffect, createSignal, untrack} from 'solid-js'
import {createPreferenceSaveQueue} from 'src/features/preference-save-queue'
import {type PreferenceOptions, usePreference} from '../use-preference'

export type PreferenceFailurePhase = 'load' | 'save'

export interface PreferenceEditorMessages {
  /** Produces feedback for an error observed without a pending local save. */
  readonly loadFailed: () => string
  /** Produces feedback when a save is attempted before the initial read completes. */
  readonly notReady: () => string
  /** Produces feedback after settling a failed write. */
  readonly saveFailed: () => string
  /** Produces feedback after settling a successful write; null removes the message. */
  readonly saved: () => string | null
}

export interface UsePreferenceEditorProps<Value extends NonNullable<unknown>> {
  /** Compares stored values with the queued or committed value without adding reactive dependencies. */
  readonly equal: (left: Value, right: Value) => boolean
  /** Feature-owned feedback, evaluated only at the corresponding transition. */
  readonly messages: PreferenceEditorMessages
  /** Creation-time provider definition; the editor owns this consumer's error and save callbacks. */
  readonly preference: Omit<PreferenceOptions<Value>, 'onError' | 'onSaved'>
  /** Reports the original error and phase before queue settlement and feedback changes. */
  readonly reportError: (error: unknown, phase: PreferenceFailurePhase) => void
}

export interface PreferenceEditor<Value extends NonNullable<unknown>> {
  readonly isLoading: Accessor<boolean>
  readonly message: Accessor<string | null>
  readonly save: (value: Value) => void
  readonly settings: Accessor<Value>
}

/** Owns one preference editor's queued writes, failed-value overlay and stored-value synchronization. */
export const usePreferenceEditor = <Value extends NonNullable<unknown>>(
  props: UsePreferenceEditorProps<Value>,
): PreferenceEditor<Value> => {
  const preference = untrack(() => props.preference)
  const [failedSettings, setFailedSettings] = createSignal<Value | null>(null)
  const [message, setMessage] = createSignal<string | null>(null)
  const saveQueue = createPreferenceSaveQueue({
    equal: props.equal,
    initial: preference.defaultValue,
  })

  const handlePreferenceError = (error: unknown) => {
    const isSaveError = saveQueue.hasPending()
    props.reportError(error, isSaveError ? 'save' : 'load')
    if (isSaveError) {
      const settled = saveQueue.settle(false)
      if (settled.value !== null && !settled.hasPending) {
        setFailedSettings(() => settled.committed)
      }
    }
    setMessage(isSaveError ? props.messages.saveFailed() : props.messages.loadFailed())
  }
  const handlePreferenceSaved = () => {
    const settled = saveQueue.settle(true)
    if (settled.value !== null) {
      if (!settled.hasPending) {
        setFailedSettings(null)
      }
      setMessage(props.messages.saved())
    }
  }
  const [storedSettings, setStoredSettings] = usePreference({
    ...preference,
    onError: handlePreferenceError,
    onSaved: handlePreferenceSaved,
  })
  const settings = () => failedSettings() ?? storedSettings() ?? preference.defaultValue
  const isLoading = () => storedSettings() === null

  createEffect(() => {
    const currentSettings = storedSettings()
    if (currentSettings === null || saveQueue.hasPending()) {
      return
    }
    if (untrack(() => saveQueue.synchronize(currentSettings))) {
      setFailedSettings(null)
    }
  })

  const save = (nextSettings: Value) => {
    if (storedSettings() === null) {
      setMessage(props.messages.notReady())
      return
    }
    saveQueue.clearFailure()
    setFailedSettings(null)
    saveQueue.enqueue(nextSettings)
    setStoredSettings(nextSettings, {rollbackOnError: true})
  }
  return {isLoading, message, save, settings}
}
