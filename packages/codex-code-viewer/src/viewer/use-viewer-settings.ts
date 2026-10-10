import {createSignal} from 'solid-js'
import {MAX_NAVIGATION_PREVIEW_LINES} from '../shared/contracts'

const STORAGE_KEY = 'codex-code-viewer.preview-lines'
const validLines = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= MAX_NAVIGATION_PREVIEW_LINES
const readPreviewLines = (): number => {
  try {
    const value = Number(globalThis.localStorage?.getItem(STORAGE_KEY))
    return validLines(value) ? value : 2
  } catch {
    // Embedded hosts may deny browser storage; retain the default in this session.
    return 2
  }
}
/** Maintains the navigation preview preference across viewer mounts when storage is available. */
export const useViewerSettings = () => {
  const [previewLines, setPreviewLines] = createSignal(readPreviewLines())
  const changePreviewLines = (value: number): void => {
    if (!validLines(value)) {
      return
    }
    setPreviewLines(value)
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, String(value))
    } catch {
      // The current session remains configurable when the host denies persistence.
    }
  }
  return {changePreviewLines, previewLines}
}
