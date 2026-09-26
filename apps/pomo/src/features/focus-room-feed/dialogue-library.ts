import {excludeByIds} from 'src/utils/exclude-by-ids'
import type {PDialogue} from '../focus-room-dialogue/schema'
import type {FeedDialogueListItem} from './feed-controller'

export const excludeFeedDialogues = (
  dialogues: ReadonlyArray<PDialogue>,
  feedDialogues: ReadonlyArray<FeedDialogueListItem>,
): ReadonlyArray<PDialogue> => {
  return excludeByIds(
    dialogues,
    feedDialogues.map((item) => item.metadata.dialogueId),
  )
}
