import {createSignal, onCleanup} from 'solid-js'
import {createDictationPreferences, DEFAULT_DICTATION_PREFERENCES} from './preferences'
import type {DictationPreferences} from './types'

/** Owns the settings page's local preference connection and serializes persisted changes. */
export const useDictationPreferences = () => {
  const repository = createDictationPreferences()
  const [value, setValue] = createSignal(DEFAULT_DICTATION_PREFERENCES)
  const [busy, setBusy] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  const report = (cause: unknown) => {
    console.error('Dictation preferences failed', cause)
    if (!disposed) {
      setError('음성 입력 설정을 저장하거나 불러오지 못했어요.')
    }
  }
  const finish = () => {
    if (!disposed) {
      setBusy(false)
    }
  }
  let pending = repository
    .read()
    .then((preferences) => {
      if (!disposed) {
        setValue(preferences)
      }
    })
    .catch(report)
    .finally(finish)
  const save = (patch: Partial<DictationPreferences>): Promise<void> => {
    setBusy(true)
    setError(null)
    pending = pending
      .then(async () => {
        if (!disposed) {
          const preferences = await repository.save(patch)
          if (!disposed) {
            setValue(preferences)
          }
        }
      })
      .catch(report)
      .finally(finish)
    return pending
  }
  onCleanup(() => {
    disposed = true
    pending.finally(repository.close).catch(report)
  })
  return {busy, error, save, value}
}
