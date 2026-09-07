import type {PDialogue} from '../focus-room-dialogue/schema'
import {isMemoryMemoDialogueId} from './dialogue-id'

export const excludeMemoryMemoDialogues = (
  dialogues: ReadonlyArray<PDialogue>,
): ReadonlyArray<PDialogue> => dialogues.filter((dialogue) => !isMemoryMemoDialogueId(dialogue.id))
