import {normalizePasteNumericInput} from '@winter-love/supertonic/normalize-paste-numeric-input'

export const normalizeClockInput = (value: string): string | null => {
  const normalized = normalizePasteNumericInput(value).replaceAll('：', ':').trim()
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(normalized) ? normalized : null
}

/** Applies a normalized full value when a native input cannot parse the original text. */
export const readFormattedPaste = (
  event: ClipboardEvent,
  normalize: (text: string) => string | null,
): string | null => {
  const text = event.clipboardData?.getData('text/plain')
  if (text === undefined) {
    return null
  }
  const value = normalize(text)
  if (value === null || value === text) {
    return null
  }
  event.preventDefault()
  return value
}
