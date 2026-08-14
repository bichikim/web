import {createModelStorage, reportModelStorageError} from '../model-storage/storage'
import {createFocusRoomDatabase} from './database'
import {
  type DialogueEventBinding,
  dialogueEventBindingSchema,
  type DialogueEventId,
  FOCUS_ROOM_DIALOGUE_EVENTS,
  FOCUS_ROOM_ENTRY_EVENT,
  type FocusRoomDialogue,
  focusRoomDialogueSchema,
} from './schema'

const AUDIO_CACHE_NAME = 'pomo-dialogue-audio-v1'

export interface SaveDialogueOptions {
  readonly audio?: Blob
  readonly dialogue: FocusRoomDialogue
}

export interface FocusRoomDialogueRepository {
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly dispose: () => void
  readonly getAudio: (audioKey: string) => Promise<Blob | null>
  readonly getDialogue: (dialogueId: string) => Promise<FocusRoomDialogue | null>
  readonly listEventBindings: () => Promise<ReadonlyArray<DialogueEventBinding>>
  readonly listDialogues: () => Promise<ReadonlyArray<FocusRoomDialogue>>
  readonly saveDialogue: (options: SaveDialogueOptions) => Promise<void>
  readonly setEntryBinding: (dialogueIds: ReadonlyArray<string> | string | null) => Promise<void>
  readonly setEventBinding: (
    event: DialogueEventId,
    dialogueIds: ReadonlyArray<string> | string | null,
  ) => Promise<void>
}

const getAudioPath = (audioKey: string) => `/__pomo/dialogue-audio/${audioKey}.wav`

/** Creates a browser repository for local dialogue metadata and generated WAV files. */
export const createFocusRoomDialogueRepository = (): FocusRoomDialogueRepository => {
  const database = createFocusRoomDatabase()
  const audioStorage = createModelStorage({cacheName: AUDIO_CACHE_NAME})
  const deleteAudio = async (audioKey: string) => {
    const deletion = await audioStorage.delete(getAudioPath(audioKey))

    if (!deletion.ok) {
      reportModelStorageError(deletion.error)
    }
  }
  const setEventBinding = async (
    event: DialogueEventId,
    dialogueIds: ReadonlyArray<string> | string | null,
  ) => {
    const requestedIds =
      typeof dialogueIds === 'string' ? [dialogueIds] : dialogueIds === null ? [] : dialogueIds
    const uniqueDialogueIds = [...new Set(requestedIds)]

    if (uniqueDialogueIds.length === 0) {
      await database.eventBindings.delete(event)
      return
    }

    const storedDialogues = await Promise.all(
      uniqueDialogueIds.map((dialogueId) => database.dialogues.get(dialogueId)),
    )

    if (storedDialogues.some((dialogue) => dialogue === undefined)) {
      throw new Error('연결할 대화를 찾을 수 없어요.')
    }

    await database.eventBindings.put({
      dialogueIds: uniqueDialogueIds,
      event,
      version: 2,
    } satisfies DialogueEventBinding)
  }

  return {
    async deleteDialogue(dialogueId) {
      const dialogue = await database.dialogues.get(dialogueId)
      const parsedDialogue = dialogue === undefined ? null : focusRoomDialogueSchema.parse(dialogue)

      await database.transaction('rw', database.dialogues, database.eventBindings, async () => {
        await database.dialogues.delete(dialogueId)
        const bindings = await Promise.all(
          FOCUS_ROOM_DIALOGUE_EVENTS.map((event) => database.eventBindings.get(event)),
        )

        await Promise.all(
          bindings.map(async (storedBinding) => {
            if (storedBinding === undefined) {
              return
            }

            const binding = dialogueEventBindingSchema.parse(storedBinding)
            const remainingIds = binding.dialogueIds.filter((id) => id !== dialogueId)

            if (remainingIds.length === binding.dialogueIds.length) {
              return
            }

            if (remainingIds.length === 0) {
              await database.eventBindings.delete(binding.event)
              return
            }

            await database.eventBindings.put({...binding, dialogueIds: remainingIds})
          }),
        )
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
    async listDialogues() {
      const dialogues = await database.dialogues.orderBy('updatedAt').reverse().toArray()
      return dialogues.map((dialogue) => focusRoomDialogueSchema.parse(dialogue))
    },
    async listEventBindings() {
      const bindings = await Promise.all(
        FOCUS_ROOM_DIALOGUE_EVENTS.map((event) => database.eventBindings.get(event)),
      )
      const parsedBindings: Array<DialogueEventBinding> = []

      for (const binding of bindings) {
        if (binding !== undefined) {
          parsedBindings.push(dialogueEventBindingSchema.parse(binding))
        }
      }

      return parsedBindings
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
    async setEntryBinding(dialogueIds) {
      await setEventBinding(FOCUS_ROOM_ENTRY_EVENT, dialogueIds)
    },
    setEventBinding,
  }
}
