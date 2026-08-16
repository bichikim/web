import type {PDialogue} from '../focus-room-dialogue/schema'
import type {FeedDialogueListItem} from './feed-controller'

export const excludeFeedDialogues = (
  dialogues: ReadonlyArray<PDialogue>,
  feedDialogues: ReadonlyArray<FeedDialogueListItem>,
): ReadonlyArray<PDialogue> => {
  const feedDialogueIds = new Set(feedDialogues.map((item) => item.metadata.dialogueId))
  return dialogues.filter((dialogue) => !feedDialogueIds.has(dialogue.id))
}
