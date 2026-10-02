import {shuffleWithRandom} from 'src/utils/shuffle-with-random'
import {sampleWithRandom} from 'src/utils/sample-with-random'
import type {EventDialogueIds, EventPlaybackModes} from './event-context'
import {
  DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
  type DialogueEventId,
  type DialogueEventPlaybackMode,
} from './schema'

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

const appendDialogueIdsWithinLimit = (
  dialogueIds: ReadonlyArray<string>,
  selectedDialogueIds: ReadonlyArray<string>,
  maxLatestDialogueIds?: number,
): ReadonlyArray<string> => {
  if (maxLatestDialogueIds === undefined) {
    return [...dialogueIds, ...selectedDialogueIds]
  }

  const remainingDialogueCount = maxLatestDialogueIds - dialogueIds.length
  if (remainingDialogueCount <= 0) {
    return [...dialogueIds]
  }

  return [...dialogueIds, ...selectedDialogueIds.slice(-remainingDialogueCount)]
}

/** Selects and orders the dialogues for one event occurrence. */
export const selectEventDialogues = (
  options: SelectEventDialoguesOptions,
): ReadonlyArray<string> => {
  switch (options.playbackMode) {
    case 'sequential-all':
      return takeLatestDialogueIds(options.dialogueIds, options.maxLatestDialogueIds)
    case 'random-all':
      return shuffleWithRandom(
        takeLatestDialogueIds(options.dialogueIds, options.maxLatestDialogueIds),
        options.random,
      )
    case 'random-one': {
      const latestDialogueIds = takeLatestDialogueIds(
        options.dialogueIds,
        options.maxLatestDialogueIds,
      )

      if (latestDialogueIds.length === 0) {
        return []
      }

      const selected = sampleWithRandom(latestDialogueIds, options.random)
      return selected === undefined ? [] : [selected]
    }
    default: {
      const exhaustiveMode: never = options.playbackMode
      return exhaustiveMode
    }
  }
}

/** Selects dialogue ids for each event occurrence while applying an optional catch-up cap. */
export const selectDialogueIdsForEvents = (
  eventIds: ReadonlyArray<DialogueEventId>,
  bindings: EventDialogueIds,
  playbackModes: EventPlaybackModes,
  maxLatestDialogueIds?: number,
): ReadonlyArray<string> =>
  eventIds.reduce<ReadonlyArray<string>>((dialogueIds, eventId) => {
    const selectedDialogueIds = selectEventDialogues({
      dialogueIds: bindings[eventId] ?? [],
      maxLatestDialogueIds,
      playbackMode: playbackModes[eventId] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
    })

    return appendDialogueIdsWithinLimit(dialogueIds, selectedDialogueIds, maxLatestDialogueIds)
  }, [])
