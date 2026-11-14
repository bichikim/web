import {createSignal} from 'solid-js'

const STORAGE_KEY = 'poffo:buffering:v1'
/** Preference outside document history; borrows the supplied store or defaults to browser localStorage. */
export const useBufferingPreferences = (storage?: Pick<Storage, 'getItem' | 'setItem'>) => {
  const [enabled, setValue] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  try {
    const stored = (storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY)
    if (stored !== null && stored !== undefined) {
      const value: unknown = JSON.parse(stored)
      if (typeof value === 'boolean') {
        setValue(value)
      }
    }
  } catch (cause) {
    if (!(cause instanceof SyntaxError)) {
      setError('재생 버퍼 설정을 불러오지 못했습니다.')
    }
  }
  const setEnabled = (value: boolean) => {
    setValue(value)
    try {
      const destination = storage ?? globalThis.localStorage
      destination?.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      setError('재생 버퍼 설정을 저장하지 못했습니다.')
    }
  }
  return {dismissError: () => setError(null), enabled, error, setEnabled}
}
