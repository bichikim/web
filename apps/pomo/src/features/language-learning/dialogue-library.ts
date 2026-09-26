import {excludeByIds} from 'src/utils/exclude-by-ids'
import type {PDialogue} from '../focus-room-dialogue/schema'
import type {LanguageLearningSentence} from './schema'

export const excludeLanguageLearningDialogues = (
  dialogues: ReadonlyArray<PDialogue>,
  sentences: ReadonlyArray<LanguageLearningSentence>,
): ReadonlyArray<PDialogue> => {
  return excludeByIds(
    dialogues,
    sentences.map((sentence) => sentence.dialogueId),
  )
}
