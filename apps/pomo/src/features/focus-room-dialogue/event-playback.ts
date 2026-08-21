import type {DialogueEventPlaybackMode} from './schema'

export interface SelectEventDialoguesOptions {
  readonly dialogueIds: ReadonlyArray<string>
  readonly playbackMode: DialogueEventPlaybackMode
  readonly random?: () => number
}

const shuffleDialogues = (dialogueIds: ReadonlyArray<string>, random: () => number) => {
  const shuffledIds = [...dialogueIds]

  for (let position = shuffledIds.length - 1; position > 0; position -= 1) {
    const targetPosition = Math.floor(random() * (position + 1))
    const currentId = shuffledIds[position]
    shuffledIds[position] = shuffledIds[targetPosition] as string
    shuffledIds[targetPosition] = currentId as string
  }

  return shuffledIds
}

/** Selects and orders the dialogues for one event occurrence. */
export const selectEventDialogues = (
  options: SelectEventDialoguesOptions,
): ReadonlyArray<string> => {
  switch (options.playbackMode) {
    case 'sequential-all':
      return [...options.dialogueIds]
    case 'random-all':
      return shuffleDialogues(options.dialogueIds, options.random ?? Math.random)
    case 'random-one': {
      if (options.dialogueIds.length === 0) {
        return []
      }

      const random = options.random ?? Math.random
      const position = Math.floor(random() * options.dialogueIds.length)
      return [options.dialogueIds[position] as string]
    }
    default: {
      const exhaustiveMode: never = options.playbackMode
      return exhaustiveMode
    }
  }
}
