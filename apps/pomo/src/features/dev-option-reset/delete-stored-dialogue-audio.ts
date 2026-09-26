import {uniq} from 'es-toolkit/array'
import {createPDialogueRepository, deleteDialogueAudio} from 'src/features/focus-room-dialogue'

export interface DialogueAudioReference {
  readonly audioKey: string
}

export interface DialogueAudioStorage {
  readonly listDialogues: () => Promise<ReadonlyArray<DialogueAudioReference>>
  readonly deleteAudio: (audioKey: string) => Promise<void>
  readonly dispose: () => void
}

export interface DialogueAudioDeletionResult {
  readonly deletedCount: number
  readonly failedCount: number
}

const createDialogueAudioStorage = (): DialogueAudioStorage => {
  const repository = createPDialogueRepository()
  return {
    deleteAudio: (audioKey) => deleteDialogueAudio(audioKey, {failureMode: 'throw'}),
    dispose: () => repository.dispose(),
    listDialogues: () => repository.listDialogues(),
  }
}

/** Deletes referenced audio and disposes the created storage without changing dialogue records. */
export const deleteStoredDialogueAudio = async (
  createStorage: () => DialogueAudioStorage = createDialogueAudioStorage,
): Promise<DialogueAudioDeletionResult> => {
  const storage = createStorage()
  try {
    const dialogues = await storage.listDialogues()
    const audioKeys = uniq(dialogues.map((dialogue) => dialogue.audioKey))
    const results = await Promise.allSettled(
      audioKeys.map((audioKey) => storage.deleteAudio(audioKey)),
    )
    const failedCount = results.filter((result) => result.status === 'rejected').length
    return {deletedCount: results.length - failedCount, failedCount}
  } finally {
    storage.dispose()
  }
}
