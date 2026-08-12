/** Appends one recognized utterance without disturbing editable text around it. */
export const appendSpeechTranscript = (current: string, next: string) => {
  const trimmedText = next.trim()

  if (trimmedText.length === 0) {
    return current
  }

  return current.trim().length === 0 ? trimmedText : `${current.trimEnd()} ${trimmedText}`
}
