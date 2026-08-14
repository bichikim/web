import type {FocusRoomDialogue} from '../focus-room-dialogue/schema'
import type {FeedDialogueListItem} from './feed-controller'

export const excludeFeedDialogues = (
  dialogues: ReadonlyArray<FocusRoomDialogue>,
  feedDialogues: ReadonlyArray<FeedDialogueListItem>,
): ReadonlyArray<FocusRoomDialogue> => {
  const feedDialogueIds = new Set(feedDialogues.map((item) => item.metadata.dialogueId))
  return dialogues.filter((dialogue) => !feedDialogueIds.has(dialogue.id))
}
