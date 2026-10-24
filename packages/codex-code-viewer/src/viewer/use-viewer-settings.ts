import {createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {MAX_NAVIGATION_PREVIEW_LINES} from '../shared/contracts'
import type {ViewerPort, ViewerSettingsEnvironment} from './types'
import type {LanguagePreference, ViewerLanguage} from './locale/types'
import {resolveViewerLanguage} from './locale/resolve-viewer-language'
import {isViewerLanguage} from './locale/is-viewer-language'
import {DEFAULT_VIEWER_LANGUAGE} from './locale/languages'

const STORAGE_KEY = 'codex-code-viewer.preview-lines'
const LANGUAGE_KEY = 'codex-code-viewer.language'
interface UseViewerSettingsProps {
  readonly environment: ViewerSettingsEnvironment
  readonly port?: Pick<ViewerPort, 'subscribeLocale'>
}
const readLanguage = (environment: ViewerSettingsEnvironment): LanguagePreference => {
  try {
    const value = environment.localStorage?.getItem(LANGUAGE_KEY)
    return value === 'auto' || isViewerLanguage(value) ? value : DEFAULT_VIEWER_LANGUAGE
  } catch {
    return DEFAULT_VIEWER_LANGUAGE
  }
}
const validLines = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= MAX_NAVIGATION_PREVIEW_LINES
const readPreviewLines = (environment: ViewerSettingsEnvironment): number => {
  try {
    const value = Number(environment.localStorage?.getItem(STORAGE_KEY))
    return validLines(value) ? value : 2
  } catch {
    // Embedded hosts may deny browser storage; retain the default in this session.
    return 2
  }
}
/** Maintains viewer language and preview preferences, following host locale in automatic mode. */
export const useViewerSettings = (props: UseViewerSettingsProps) => {
  const [previewLines, setPreviewLines] = createSignal(readPreviewLines(props.environment))
  const [preference, setPreference] = createSignal(readLanguage(props.environment))
  const [hostLocale, setHostLocale] = createSignal<string | null>(null)
  const language = createMemo((): ViewerLanguage => {
    const selected = preference()
    if (selected !== 'auto') {
      return selected
    }
    const locale = hostLocale() || props.environment.navigator?.language || DEFAULT_VIEWER_LANGUAGE
    return resolveViewerLanguage(locale)
  })
  onMount(() => {
    const stop = props.port?.subscribeLocale?.((locale) => setHostLocale(locale ?? null))
    onCleanup(() => stop?.())
  })
  const changeLanguage = (value: LanguagePreference): void => {
    setPreference(value)
    try {
      props.environment.localStorage?.setItem(LANGUAGE_KEY, value)
    } catch {
      // The selected language still applies when the host denies storage.
    }
  }
  const changePreviewLines = (value: number): void => {
    if (!validLines(value)) {
      return
    }
    setPreviewLines(value)
    try {
      props.environment.localStorage?.setItem(STORAGE_KEY, String(value))
    } catch {
      // The current session remains configurable when the host denies persistence.
    }
  }
  return {changeLanguage, changePreviewLines, language, preference, previewLines}
}
