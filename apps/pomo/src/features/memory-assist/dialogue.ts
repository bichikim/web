import {generateCompressedDialogueAudio, type PDialogueRepository} from '../focus-room-dialogue'
import type {
  SupertonicClient,
  SupertonicLanguage,
  SupertonicModelId,
  SupertonicVoiceId,
} from '../supertonic'
import {getMemoryMemoDialogueId} from './dialogue-id'
import type {MemoryMemo} from './schema'

type GenerateCompressedDialogueAudio = typeof generateCompressedDialogueAudio

export interface CreateMemoryMemoDialogueOptions {
  readonly client: SupertonicClient
  readonly generate?: GenerateCompressedDialogueAudio
  readonly language: SupertonicLanguage
  readonly memo: MemoryMemo
  readonly modelId: SupertonicModelId
  readonly repository: Pick<PDialogueRepository, 'saveDialogue'>
  readonly voiceId: SupertonicVoiceId
}

/** Generates one reusable compressed dialogue owned by a memo. */
export const createMemoryMemoDialogue = async (options: CreateMemoryMemoDialogueOptions) => {
  const generate = options.generate ?? generateCompressedDialogueAudio
  const generated = await generate({
    client: options.client,
    language: options.language,
    modelId: options.modelId,
    onChunk: () => undefined,
    text: options.memo.text,
    voiceId: options.voiceId,
  })

  if (!generated.ok) {
    throw new Error(generated.message)
  }

  const dialogueId = getMemoryMemoDialogueId(options.memo.id)
  const timestamp = new Date().toISOString()
  await options.repository.saveDialogue({
    audio: generated.value.audio,
    dialogue: {
      audioKey: dialogueId,
      createdAt: timestamp,
      durationMs: generated.value.durationMs,
      id: dialogueId,
      language: options.language,
      modelId: options.modelId,
      segments: generated.value.segments,
      text: options.memo.text,
      updatedAt: timestamp,
      version: 1,
      voiceId: options.voiceId,
    },
  })

  return dialogueId
}
