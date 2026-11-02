import {createSignal} from 'solid-js'

const STORAGE_KEY = 'poffo:buffering:v1'
/** Browser preference, independent from the shared document and undo/redo. */
export const useBufferingPreferences = () => {
  const [enabled, setValue] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY)
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
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      setError('재생 버퍼 설정을 저장하지 못했습니다.')
    }
  }
  return {dismissError: () => setError(null), enabled, error, setEnabled}
}
