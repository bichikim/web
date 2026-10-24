import type {PDialogue, PDialogueRepository} from '../../features/focus-room-dialogue'
import {
  appendLanguageLearningSentences,
  type LanguageLearningLanguage,
  type LanguageLearningSentence,
  rollbackLanguageLearningDialogues,
} from '../../features/language-learning'
import type {LanguageLearningCandidate} from './candidate'

export interface SaveLanguageLearningCandidatesOptions {
  readonly candidates: ReadonlyArray<LanguageLearningCandidate>
  readonly createdAt: string
  readonly language: LanguageLearningLanguage
  readonly repository: Pick<PDialogueRepository, 'deleteDialogue' | 'saveDialogue'>
  readonly tags: ReadonlyArray<string>
}

export const saveLanguageLearningCandidates = async (
  options: SaveLanguageLearningCandidatesOptions,
): Promise<void> => {
  const savedIds: Array<string> = []

  try {
    const records: Array<LanguageLearningSentence> = []

    for (const candidate of options.candidates) {
      const dialogue = {
        audioKey: candidate.audioKey,
        createdAt: options.createdAt,
        durationMs: candidate.durationMs,
        id: candidate.id,
        language: options.language,
        modelId: candidate.modelId,
        segments: candidate.segments,
        text: candidate.text,
        updatedAt: options.createdAt,
        version: 1,
        voiceId: candidate.voiceId,
      } satisfies PDialogue
      // oxlint-disable-next-line eslint/no-await-in-loop -- Each saved dialogue is tracked for deterministic rollback.
      await options.repository.saveDialogue({audio: candidate.audio, dialogue})
      savedIds.push(candidate.id)
      records.push({
        createdAt: options.createdAt,
        dialogueId: candidate.id,
        language: options.language,
        tags: options.tags,
        text: candidate.text,
        version: 1,
      })
    }

    appendLanguageLearningSentences(records)
  } catch (error: unknown) {
    const rollbackFailures = await rollbackLanguageLearningDialogues({
      deleteDialogue: options.repository.deleteDialogue,
      dialogueIds: savedIds,
    })
    throw new AggregateError(
      [error, ...rollbackFailures],
      'Failed to save language learning candidates.',
    )
  }
}
