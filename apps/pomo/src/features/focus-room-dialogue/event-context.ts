import {type Accessor, createContext, useContext} from 'solid-js'

import type {PViseme} from '../lip-sync'
import type {DialogueSequenceReplacementPolicy} from './dialogue-playback-policy'
import type {PlayPDialogueSequenceOptions} from './entry-playback-controller'
import type {
  DialogueEventId,
  DialogueEventPlaybackMode,
  DialogueSegmentMood,
  EventActionId,
  PDialogue,
} from './schema'

export type {PlayPDialogueSequenceOptions} from './entry-playback-controller'
export type {DialogueSegmentMood} from './schema'

export type EventDialogueIds = Readonly<Partial<Record<DialogueEventId, ReadonlyArray<string>>>>
export type EventPlaybackModes = Readonly<
  Partial<Record<DialogueEventId, DialogueEventPlaybackMode>>
>
export type EventActionIds = Readonly<
  Partial<Record<DialogueEventId, ReadonlyArray<EventActionId>>>
>
export type EventBindingItem =
  | {readonly type: 'dialogue'; readonly id: string}
  | {readonly type: 'action'; readonly id: EventActionId}
export type EventActionExecutor = (actionId: EventActionId) => void

export interface PlayDialogueEventsOptions {
  readonly replacementPolicy?: DialogueSequenceReplacementPolicy
}

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
  readonly eventActionIds: Accessor<EventActionIds>
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
  readonly playDialogue: (dialogueId: string) => Promise<boolean>
  readonly registerBeforePlayback?: (callback: () => void) => () => void
  readonly playDialogueEvents: (
    eventIds: ReadonlyArray<DialogueEventId>,
    onBeforePlayback?: () => void,
    options?: PlayDialogueEventsOptions,
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
  readonly setEventItems: (
    eventId: DialogueEventId,
    items: ReadonlyArray<EventBindingItem>,
  ) => Promise<void>
  readonly setEventPlaybackMode: (
    eventId: DialogueEventId,
    playbackMode: DialogueEventPlaybackMode,
  ) => Promise<void>
  readonly registerEventActionExecutor: (executor: EventActionExecutor) => () => void
  readonly delayedEndEventDurationMinutes: Accessor<number>
  readonly delayedEndEventIsRunning: Accessor<boolean>
  readonly setDelayedEndEventDuration: (durationMinutes: number) => Promise<void>
  readonly startDelayedEndEvent: () => void
  readonly cancelDelayedEndEvent: () => void
}

export const PEventContext = createContext<PEventContextValue>()

export const usePEvents = () => {
  const context = useContext(PEventContext)

  if (context === undefined) {
    throw new Error('usePEvents must be used inside PEventProvider.')
  }

  return context
}
