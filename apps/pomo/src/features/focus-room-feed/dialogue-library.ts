import {differenceBy} from 'es-toolkit/array'
import type {PDialogue} from '../focus-room-dialogue/schema'
import type {FeedDialogueListItem} from './feed-controller'

export const excludeFeedDialogues = (
  dialogues: ReadonlyArray<PDialogue>,
  feedDialogues: ReadonlyArray<FeedDialogueListItem>,
): ReadonlyArray<PDialogue> => {
  return differenceBy(
    dialogues,
    feedDialogues.map((item) => ({id: item.metadata.dialogueId})),
    (dialogue) => dialogue.id,
  )
}
