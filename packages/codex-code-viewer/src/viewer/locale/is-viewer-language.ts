import {VIEWER_LANGUAGES} from './languages'
import type {ViewerLanguage} from './types'

export const isViewerLanguage = (value: unknown): value is ViewerLanguage =>
  VIEWER_LANGUAGES.some((language) => language.value === value)
