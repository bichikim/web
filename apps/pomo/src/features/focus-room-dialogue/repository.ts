import Dexie, {type Table} from 'dexie'

import {createModelStorage, reportModelStorageError} from '../model-storage/storage'
import {
  type DialogueEventBinding,
  dialogueEventBindingSchema,
  FOCUS_ROOM_ENTRY_EVENT,
  type FocusRoomDialogue,
  focusRoomDialogueSchema,
} from './schema'

const DATABASE_NAME = 'pomo-focus-room'
const AUDIO_CACHE_NAME = 'pomo-dialogue-audio-v1'

interface DialogueDatabase extends Dexie {
  readonly dialogues: Table<unknown, string>
  readonly eventBindings: Table<unknown, string>
}

export interface SaveDialogueOptions {
  readonly audio?: Blob
  readonly dialogue: FocusRoomDialogue
}

export interface FocusRoomDialogueRepository {
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly dispose: () => void
  readonly getAudio: (audioKey: string) => Promise<Blob | null>
  readonly getDialogue: (dialogueId: string) => Promise<FocusRoomDialogue | null>
  readonly getEntryBinding: () => Promise<DialogueEventBinding | null>
  readonly listDialogues: () => Promise<ReadonlyArray<FocusRoomDialogue>>
  readonly saveDialogue: (options: SaveDialogueOptions) => Promise<void>
  readonly setEntryBinding: (dialogueId: string | null) => Promise<void>
}

const createDatabase = (): DialogueDatabase => {
  const database = new Dexie(DATABASE_NAME) as DialogueDatabase
  database.version(1).stores({dialogues: 'id, updatedAt', eventBindings: 'event'})
  return database
}

const getAudioPath = (audioKey: string) => `/__pomo/dialogue-audio/${audioKey}.wav`

/** Creates a browser repository for local dialogue metadata and generated WAV files. */
export const createFocusRoomDialogueRepository = (): FocusRoomDialogueRepository => {
  const database = createDatabase()
  const audioStorage = createModelStorage({cacheName: AUDIO_CACHE_NAME})
  const deleteAudio = async (audioKey: string) => {
    const deletion = await audioStorage.delete(getAudioPath(audioKey))

    if (!deletion.ok) {
      reportModelStorageError(deletion.error)
    }
  }

  return {
    async deleteDialogue(dialogueId) {
      const dialogue = await database.dialogues.get(dialogueId)
      const parsedDialogue = dialogue === undefined ? null : focusRoomDialogueSchema.parse(dialogue)

      await database.transaction('rw', database.dialogues, database.eventBindings, async () => {
        await database.dialogues.delete(dialogueId)
        const binding = await database.eventBindings.get(FOCUS_ROOM_ENTRY_EVENT)

        if (
          binding !== undefined &&
          dialogueEventBindingSchema.parse(binding).dialogueId === dialogueId
        ) {
          await database.eventBindings.delete(FOCUS_ROOM_ENTRY_EVENT)
        }
      })

      if (parsedDialogue !== null) {
        // AI_NOTE - IndexedDB 삭제가 이미 확정된 뒤이므로 캐시 정리 실패가 UI 삭제를 되돌린 것처럼 보이면 안 된다.
        await deleteAudio(parsedDialogue.audioKey)
      }
    },
    dispose() {
      database.close()
    },
    async getAudio(audioKey) {
      const result = await audioStorage.get(getAudioPath(audioKey))

      if (!result.ok) {
        throw new Error('대화 음성을 불러오지 못했어요.', {cause: result.error.cause})
      }

      return result.value === null ? null : result.value.blob()
    },
    async getDialogue(dialogueId) {
      const dialogue = await database.dialogues.get(dialogueId)
      return dialogue === undefined ? null : focusRoomDialogueSchema.parse(dialogue)
    },
    async getEntryBinding() {
      const binding = await database.eventBindings.get(FOCUS_ROOM_ENTRY_EVENT)
      return binding === undefined ? null : dialogueEventBindingSchema.parse(binding)
    },
    async listDialogues() {
      const dialogues = await database.dialogues.orderBy('updatedAt').reverse().toArray()
      return dialogues.map((dialogue) => focusRoomDialogueSchema.parse(dialogue))
    },
    async saveDialogue(options) {
      const nextDialogue = focusRoomDialogueSchema.parse(options.dialogue)
      const previous = await database.dialogues.get(nextDialogue.id)
      const previousDialogue =
        previous === undefined ? null : focusRoomDialogueSchema.parse(previous)

      if (options.audio !== undefined) {
        const write = await audioStorage.set(
          getAudioPath(nextDialogue.audioKey),
          new Response(options.audio, {headers: {'Content-Type': 'audio/wav'}}),
        )

        if (!write.ok) {
          throw new Error('대화 음성을 저장하지 못했어요.', {cause: write.error.cause})
        }
      } else if (previousDialogue?.audioKey !== nextDialogue.audioKey) {
        throw new Error('새 대화 음성이 필요해요.')
      }

      try {
        await database.dialogues.put(nextDialogue)
      } catch (error: unknown) {
        if (options.audio !== undefined && previousDialogue?.audioKey !== nextDialogue.audioKey) {
          await deleteAudio(nextDialogue.audioKey)
        }

        throw error
      }

      if (previousDialogue !== null && previousDialogue.audioKey !== nextDialogue.audioKey) {
        await deleteAudio(previousDialogue.audioKey)
      }
    },
    async setEntryBinding(dialogueId) {
      if (dialogueId === null) {
        await database.eventBindings.delete(FOCUS_ROOM_ENTRY_EVENT)
        return
      }

      if ((await database.dialogues.get(dialogueId)) === undefined) {
        throw new Error('연결할 대화를 찾을 수 없어요.')
      }

      await database.eventBindings.put({
        dialogueId,
        event: FOCUS_ROOM_ENTRY_EVENT,
        version: 1,
      } satisfies DialogueEventBinding)
    },
  }
}
