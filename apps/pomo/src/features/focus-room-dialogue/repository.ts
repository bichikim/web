import {
  createModelStorage,
  type ModelStorage,
  reportModelStorageError,
} from '../model-storage/storage'
import {compressLegacyWave} from './compress-legacy-wave'
import {createPDatabase} from './database'
import {deleteDialogueRecord} from './dialogue-record'
import {
  CURRENT_DIALOGUE_EVENT_BINDING_VERSION,
  DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
  type DialogueEventBinding,
  dialogueEventBindingSchema,
  type DialogueEventId,
  type DialogueEventPlaybackMode,
  FOCUS_ROOM_DIALOGUE_EVENTS,
  FOCUS_ROOM_ENTRY_EVENT,
  focusRoomDialogueSchema,
  type PDialogue,
} from './schema'

const AUDIO_CACHE_NAME = 'pomo-dialogue-audio-v1'
const AUDIO_FORMATS = ['opus', 'wav'] as const

type AudioFormat = (typeof AUDIO_FORMATS)[number]

export interface SaveDialogueOptions {
  readonly audio?: Blob
  readonly dialogue: PDialogue
}

export interface PDialogueRepository {
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly dispose: () => void
  readonly getAudio: (audioKey: string) => Promise<Blob | null>
  readonly getDialogue: (dialogueId: string) => Promise<PDialogue | null>
  readonly listEventBindings: () => Promise<ReadonlyArray<DialogueEventBinding>>
  readonly listDialogues: () => Promise<ReadonlyArray<PDialogue>>
  readonly saveDialogue: (options: SaveDialogueOptions) => Promise<void>
  readonly setEntryBinding: (dialogueIds: ReadonlyArray<string> | string | null) => Promise<void>
  readonly setEventBinding: (
    event: DialogueEventId,
    dialogueIds: ReadonlyArray<string> | string | null,
    playbackMode?: DialogueEventPlaybackMode,
  ) => Promise<void>
}

const getAudioFormat = (audio: Blob): AudioFormat =>
  audio.type.startsWith('audio/ogg') ? 'opus' : 'wav'

const getAudioPath = (audioKey: string, format: AudioFormat) =>
  `/__pomo/dialogue-audio/${audioKey}.${format}`

const getAudioMediaType = (audio: Blob, format: AudioFormat) =>
  audio.type.length > 0 ? audio.type : format === 'opus' ? 'audio/ogg; codecs=opus' : 'audio/wav'

interface MigrateLegacyAudioOptions {
  readonly audioKey: string
  readonly audioStorage: ModelStorage
  readonly waveAudio: Blob
}

const migrateLegacyAudio = async (options: MigrateLegacyAudioOptions): Promise<Blob> => {
  try {
    const opusAudio = await compressLegacyWave(options.waveAudio)
    const write = await options.audioStorage.set(
      getAudioPath(options.audioKey, 'opus'),
      new Response(opusAudio, {
        headers: {'Content-Type': getAudioMediaType(opusAudio, 'opus')},
      }),
    )

    if (!write.ok) {
      reportModelStorageError(write.error)
      return options.waveAudio
    }

    const deletion = await options.audioStorage.delete(getAudioPath(options.audioKey, 'wav'))

    if (!deletion.ok) {
      reportModelStorageError(deletion.error)
    }

    return opusAudio
  } catch (error: unknown) {
    console.warn('Failed to migrate legacy dialogue audio to Opus.', error)
    return options.waveAudio
  }
}

const createLegacyAudioMigrator = (audioStorage: ModelStorage) => {
  const audioMigrations = new Map<string, Promise<Blob>>()

  return (audioKey: string, waveAudio: Blob) => {
    const pendingMigration = audioMigrations.get(audioKey)

    if (pendingMigration !== undefined) {
      return pendingMigration
    }

    const migration = migrateLegacyAudio({audioKey, audioStorage, waveAudio}).finally(() =>
      audioMigrations.delete(audioKey),
    )
    audioMigrations.set(audioKey, migration)
    return migration
  }
}

/** Creates a browser repository for dialogue metadata and locally cached compressed audio. */
export const createPDialogueRepository = (): PDialogueRepository => {
  const database = createPDatabase()
  const audioStorage = createModelStorage({cacheName: AUDIO_CACHE_NAME})
  const getMigratedAudio = createLegacyAudioMigrator(audioStorage)
  const deleteAudio = async (audioKey: string) => {
    const deletions = await Promise.all(
      AUDIO_FORMATS.map((format) => audioStorage.delete(getAudioPath(audioKey, format))),
    )

    for (const deletion of deletions) {
      if (!deletion.ok) {
        reportModelStorageError(deletion.error)
      }
    }
  }
  const setEventBinding = async (
    event: DialogueEventId,
    dialogueIds: ReadonlyArray<string> | string | null,
    playbackMode: DialogueEventPlaybackMode = DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
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
      playbackMode,
      version: CURRENT_DIALOGUE_EVENT_BINDING_VERSION,
    } satisfies DialogueEventBinding)
  }
  return {
    async deleteDialogue(dialogueId) {
      const dialogue = await database.dialogues.get(dialogueId)
      const parsedDialogue = dialogue === undefined ? null : focusRoomDialogueSchema.parse(dialogue)

      await database.transaction('rw', database.dialogues, database.eventBindings, () =>
        deleteDialogueRecord(database, dialogueId),
      )

      if (parsedDialogue !== null) {
        // IndexedDB 삭제가 이미 확정된 뒤이므로 캐시 정리 실패가 UI 삭제를 되돌린 것처럼 보이면 안 된다.
        await deleteAudio(parsedDialogue.audioKey)
      }
    },
    dispose() {
      database.close()
    },
    async getAudio(audioKey) {
      const [opusResult, waveResult] = await Promise.all(
        AUDIO_FORMATS.map((format) => audioStorage.get(getAudioPath(audioKey, format))),
      )

      if (opusResult?.ok === true && opusResult.value !== null) {
        return opusResult.value.blob()
      }

      if (waveResult?.ok === true && waveResult.value !== null) {
        const waveAudio = await waveResult.value.blob()
        return getMigratedAudio(audioKey, waveAudio)
      }

      const failed = [opusResult, waveResult].find((result) => result !== undefined && !result.ok)

      if (failed !== undefined && !failed.ok) {
        throw new Error('대화 음성을 불러오지 못했어요.', {cause: failed.error.cause})
      }

      return null
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
        const audioFormat = getAudioFormat(options.audio)
        const write = await audioStorage.set(
          getAudioPath(nextDialogue.audioKey, audioFormat),
          new Response(options.audio, {
            headers: {'Content-Type': getAudioMediaType(options.audio, audioFormat)},
          }),
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
