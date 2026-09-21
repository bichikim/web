import {createDraftStorage} from '../value-storage'
const DIALOGUE_DRAFT_KEY_PREFIX = 'pomo:focus-room-dialogue:draft:'

export const getDialogueDraftKey = (dialogueId: string | null) =>
  `${DIALOGUE_DRAFT_KEY_PREFIX}${dialogueId ?? 'new'}`

export interface DialogueDraftStorage {
  readonly getItem: (key: string) => string | null
  readonly removeItem: (key: string) => void
  readonly setItem: (key: string, value: string) => void
}

const getDraftStorage = (key: string, storage?: DialogueDraftStorage) =>
  createDraftStorage({
    decode: (text) => text,
    encode: (text: string) => text,
    key,
    messages: {
      delete: 'Failed to delete focus room dialogue draft.',
      read: 'Failed to read focus room dialogue draft.',
      write: 'Failed to save focus room dialogue draft.',
    },
    storage: () => storage ?? globalThis.sessionStorage,
  })

export const readDialogueDraft = (key: string, storage?: DialogueDraftStorage): string | null =>
  getDraftStorage(key, storage).read()

export const writeDialogueDraft = (
  key: string,
  text: string,
  storage?: DialogueDraftStorage,
): void => getDraftStorage(key, storage).write(text)

export const deleteDialogueDraft = (key: string, storage?: DialogueDraftStorage): void =>
  getDraftStorage(key, storage).delete()
