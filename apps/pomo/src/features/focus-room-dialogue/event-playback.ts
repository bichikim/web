import type {DialogueEventPlaybackMode} from './schema'

export interface SelectEventDialoguesOptions {
  readonly dialogueIds: ReadonlyArray<string>
  readonly maxLatestDialogueIds?: number
  readonly playbackMode: DialogueEventPlaybackMode
  readonly random?: () => number
}

const takeLatestDialogueIds = (
  dialogueIds: ReadonlyArray<string>,
  maxLatestDialogueIds?: number,
) => {
  if (maxLatestDialogueIds === undefined) {
    return [...dialogueIds]
  }

  return maxLatestDialogueIds <= 0 ? [] : dialogueIds.slice(-maxLatestDialogueIds)
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
      return takeLatestDialogueIds(options.dialogueIds, options.maxLatestDialogueIds)
    case 'random-all':
      return shuffleDialogues(
        takeLatestDialogueIds(options.dialogueIds, options.maxLatestDialogueIds),
        options.random ?? Math.random,
      )
    case 'random-one': {
      const latestDialogueIds = takeLatestDialogueIds(
        options.dialogueIds,
        options.maxLatestDialogueIds,
      )

      if (latestDialogueIds.length === 0) {
        return []
      }

      const random = options.random ?? Math.random
      const position = Math.floor(random() * latestDialogueIds.length)
      return [latestDialogueIds[position] as string]
    }
    default: {
      const exhaustiveMode: never = options.playbackMode
      return exhaustiveMode
    }
  }
}
