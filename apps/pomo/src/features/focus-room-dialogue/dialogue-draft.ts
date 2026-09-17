/* istanbul ignore next -- Wallaby inconsistently counts module initialization across workers. */
const DIALOGUE_DRAFT_KEY_PREFIX = 'pomo:focus-room-dialogue:draft:'

export const getDialogueDraftKey = (dialogueId: string | null) =>
  `${DIALOGUE_DRAFT_KEY_PREFIX}${dialogueId ?? 'new'}`

export interface DialogueDraftStorage {
  readonly getItem: (key: string) => string | null
  readonly removeItem: (key: string) => void
  readonly setItem: (key: string, value: string) => void
}

const getStorage = (storage?: DialogueDraftStorage): DialogueDraftStorage =>
  storage ?? globalThis.sessionStorage

export const readDialogueDraft = (key: string, storage?: DialogueDraftStorage) => {
  try {
    return getStorage(storage).getItem(key)
  } catch (error: unknown) {
    console.warn('Failed to read focus room dialogue draft.', error)
    return null
  }
}

export const writeDialogueDraft = (
  key: string,
  text: string,
  storage?: DialogueDraftStorage,
): void => {
  try {
    getStorage(storage).setItem(key, text)
  } catch (error: unknown) {
    console.warn('Failed to save focus room dialogue draft.', error)
  }
}

export const deleteDialogueDraft = (key: string, storage?: DialogueDraftStorage): void => {
  try {
    getStorage(storage).removeItem(key)
  } catch (error: unknown) {
    console.warn('Failed to delete focus room dialogue draft.', error)
  }
}
