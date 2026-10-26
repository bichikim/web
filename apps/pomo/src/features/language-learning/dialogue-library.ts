import {differenceBy} from 'es-toolkit/array'
import type {PDialogue} from '../focus-room-dialogue/schema'
import type {LanguageLearningSentence} from './schema'

export const excludeLanguageLearningDialogues = (
  dialogues: ReadonlyArray<PDialogue>,
  sentences: ReadonlyArray<LanguageLearningSentence>,
): ReadonlyArray<PDialogue> => {
  return differenceBy(
    dialogues,
    sentences.map((sentence) => ({id: sentence.dialogueId})),
    (dialogue) => dialogue.id,
  )
}
