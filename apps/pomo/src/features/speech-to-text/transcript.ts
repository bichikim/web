import {isNonBlankString} from 'src/utils/is-non-blank-string'

/** Appends one recognized utterance without disturbing editable text around it. */
export const appendSpeechTranscript = (current: string, next: string) => {
  const trimmedText = next.trim()

  if (trimmedText.length === 0) {
    return current
  }

  return isNonBlankString(current) ? `${current.trimEnd()} ${trimmedText}` : trimmedText
}
