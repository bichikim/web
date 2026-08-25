import {type Accessor, createContext, useContext} from 'solid-js'

import type {PViseme} from '../lip-sync'
import type {PlayPDialogueSequenceOptions} from './entry-playback-controller'
import type {
  DialogueEventId,
  DialogueEventPlaybackMode,
  DialogueSegmentMood,
  PDialogue,
} from './schema'

export type {PlayPDialogueSequenceOptions} from './entry-playback-controller'
export type {DialogueSegmentMood} from './schema'

export type EventDialogueIds = Readonly<Partial<Record<DialogueEventId, ReadonlyArray<string>>>>
export type EventPlaybackModes = Readonly<
  Partial<Record<DialogueEventId, DialogueEventPlaybackMode>>
>

export interface PEventContextValue {
  readonly activeDialogueId: Accessor<string | null>
  readonly activeSegmentCount: Accessor<number>
  readonly activeSegmentMood: Accessor<DialogueSegmentMood | null>
  readonly activeSegmentPosition: Accessor<number | null>
  readonly activeText: Accessor<string | null>
  readonly activeViseme: Accessor<PViseme>
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly dialogues: Accessor<ReadonlyArray<PDialogue>>
  readonly entryDialogueId: Accessor<string | null>
  readonly entryDialogueIds: Accessor<ReadonlyArray<string>>
  readonly errorMessage: Accessor<string | null>
  readonly eventDialogueIds: Accessor<EventDialogueIds>
  readonly eventPlaybackModes: Accessor<EventPlaybackModes>
  readonly getAudio: (audioKey: string) => Promise<Blob | null>
  readonly hasEnteredFocusRoom: Accessor<boolean>
  readonly isDialoguePlaybackBlocked: Accessor<boolean>
  readonly isDialoguePlaying: Accessor<boolean>
  readonly isDialogueScheduled: (dialogueId: string) => boolean
  readonly isEntryPlaybackBlocked: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly onStopDialoguePlayback: () => void
  readonly onStopEntryPlayback: () => void
  readonly enterFocusRoom: () => void
  readonly playDialogue: (dialogueId: string) => Promise<void>
  readonly playDialogueEvents: (
    eventIds: ReadonlyArray<DialogueEventId>,
    onBeforePlayback?: () => void,
  ) => Promise<void>
  readonly playDialogueSequence: (options: PlayPDialogueSequenceOptions) => Promise<void>
  readonly refreshDialogues: () => Promise<void>
  readonly retryDialoguePlayback: () => void
  readonly retryEntryPlayback: () => void
  readonly scheduledDialogueCount: Accessor<number>
  readonly skipDialoguePlayback: () => void
  readonly setEntryDialogue: (dialogueId: string | null) => Promise<void>
  readonly setEntryDialogues: (dialogueIds: ReadonlyArray<string>) => Promise<void>
  readonly setEventDialogue: (eventId: DialogueEventId, dialogueId: string | null) => Promise<void>
  readonly setEventDialogues: (
    eventId: DialogueEventId,
    dialogueIds: ReadonlyArray<string>,
  ) => Promise<void>
  readonly setEventPlaybackMode: (
    eventId: DialogueEventId,
    playbackMode: DialogueEventPlaybackMode,
  ) => Promise<void>
}

export const PEventContext = createContext<PEventContextValue>()

export const usePEvents = () => {
  const context = useContext(PEventContext)

  if (context === undefined) {
    throw new Error('usePEvents must be used inside PEventProvider.')
  }

  return context
}
