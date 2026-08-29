import type {PDialogue} from '../focus-room-dialogue/schema'
import type {LanguageLearningSentence} from './schema'

export const excludeLanguageLearningDialogues = (
  dialogues: ReadonlyArray<PDialogue>,
  sentences: ReadonlyArray<LanguageLearningSentence>,
): ReadonlyArray<PDialogue> => {
  const learningDialogueIds = new Set(sentences.map((sentence) => sentence.dialogueId))
  return dialogues.filter((dialogue) => !learningDialogueIds.has(dialogue.id))
}
