const DIALOGUE_DRAFT_KEY_PREFIX = 'pomo:focus-room-dialogue:draft:'

export const getDialogueDraftKey = (dialogueId: string | null) =>
  `${DIALOGUE_DRAFT_KEY_PREFIX}${dialogueId ?? 'new'}`

export const readDialogueDraft = (key: string) => {
  try {
    return sessionStorage.getItem(key)
  } catch (error: unknown) {
    console.warn('Failed to read focus room dialogue draft.', error)
    return null
  }
}

export const writeDialogueDraft = (key: string, text: string) => {
  try {
    sessionStorage.setItem(key, text)
  } catch (error: unknown) {
    console.warn('Failed to save focus room dialogue draft.', error)
  }
}

export const deleteDialogueDraft = (key: string) => {
  try {
    sessionStorage.removeItem(key)
  } catch (error: unknown) {
    console.warn('Failed to delete focus room dialogue draft.', error)
  }
}
