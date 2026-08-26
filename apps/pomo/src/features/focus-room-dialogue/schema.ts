import {z} from 'zod'

import {P_VISEMES} from '../lip-sync'
import {
  SUPERTONIC_LANGUAGES,
  SUPERTONIC_VOICES,
  type SupertonicLanguage,
  type SupertonicVoiceId,
} from '../supertonic'
import {MOOD_MODIFIER_IDS, PRIMARY_MOOD_IDS} from '../text-mood/labels'

export const DEFAULT_FOCUS_ROOM_DIALOGUE_LANGUAGE = 'ko' satisfies SupertonicLanguage
export const RANDOM_DIALOGUE_EVENT = 'random' as const

export const FOCUS_ROOM_DIALOGUE_EVENTS = [
  'room-enter',
  'focus-start',
  'focus-end',
  'break-start',
  'break-end',
  'long-break-start',
  'long-break-end',
  RANDOM_DIALOGUE_EVENT,
] as const
export const FOCUS_ROOM_ENTRY_EVENT = 'room-enter' as const
export const dialogueEventIdSchema = z.enum(FOCUS_ROOM_DIALOGUE_EVENTS)
export const DIALOGUE_EVENT_PLAYBACK_MODES = ['sequential-all', 'random-all', 'random-one'] as const
export const DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE = 'sequential-all' as const
export const dialogueEventPlaybackModeSchema = z.enum(DIALOGUE_EVENT_PLAYBACK_MODES)
// oxlint-disable-next-line eslint/no-magic-numbers -- Persisted binding schema version.
export const CURRENT_DIALOGUE_EVENT_BINDING_VERSION = 3 as const

const moodScoreSchema = z.object({
  id: z.enum(PRIMARY_MOOD_IDS),
  probability: z.number().min(0).max(1),
})
const moodModifierScoreSchema = z.object({
  active: z.boolean(),
  id: z.enum(MOOD_MODIFIER_IDS),
  probability: z.number().min(0).max(1),
  threshold: z.number().min(0).max(1),
})

export const dialogueSegmentMoodSchema = z.object({
  margin: z.number().min(0).max(1),
  modifiers: z.array(moodModifierScoreSchema).readonly(),
  primary: moodScoreSchema,
  scores: z.array(moodScoreSchema).min(1).readonly(),
  secondary: moodScoreSchema.nullable(),
  uncertain: z.boolean(),
})

const visemeCueSchema = z.object({
  endMs: z.number().nonnegative(),
  startMs: z.number().nonnegative(),
  viseme: z.enum(P_VISEMES),
})

const dialogueSegmentSchema = z.object({
  durationMs: z.number().nonnegative(),
  index: z.number().int().nonnegative(),
  mood: dialogueSegmentMoodSchema.optional(),
  startMs: z.number().nonnegative(),
  text: z.string().min(1),
  visemes: z.array(visemeCueSchema).readonly().optional(),
})
const supertonicVoiceIdSchema = z.custom<SupertonicVoiceId>((value) =>
  SUPERTONIC_VOICES.some((voice) => voice.id === value),
)

export const focusRoomDialogueSchema = z.object({
  audioKey: z.string().min(1),
  createdAt: z.iso.datetime(),
  durationMs: z.number().nonnegative(),
  id: z.string().min(1),
  language: z.enum(SUPERTONIC_LANGUAGES).default(DEFAULT_FOCUS_ROOM_DIALOGUE_LANGUAGE),
  modelId: z.enum(['full', 'int8']),
  segments: z.array(dialogueSegmentSchema).min(1).readonly(),
  text: z.string().min(1),
  updatedAt: z.iso.datetime(),
  version: z.literal(1),
  voiceId: supertonicVoiceIdSchema,
})

const legacyDialogueEventBindingSchema = z.object({
  dialogueId: z.string().min(1),
  event: dialogueEventIdSchema,
  version: z.literal(1),
})
const orderedDialogueEventBindingSchema = z.object({
  dialogueIds: z.array(z.string().min(1)).min(1).readonly(),
  event: dialogueEventIdSchema,
  version: z.literal(2),
})
const currentDialogueEventBindingSchema = z.object({
  dialogueIds: z.array(z.string().min(1)).min(1).readonly(),
  event: dialogueEventIdSchema,
  playbackMode: dialogueEventPlaybackModeSchema,
  version: z.literal(CURRENT_DIALOGUE_EVENT_BINDING_VERSION),
})

export type DialogueEventBinding = z.infer<typeof currentDialogueEventBindingSchema>

export const dialogueEventBindingSchema = z
  .union([
    legacyDialogueEventBindingSchema,
    orderedDialogueEventBindingSchema,
    currentDialogueEventBindingSchema,
  ])
  .transform(
    (binding): DialogueEventBinding =>
      binding.version === CURRENT_DIALOGUE_EVENT_BINDING_VERSION
        ? binding
        : {
            dialogueIds: binding.version === 1 ? [binding.dialogueId] : binding.dialogueIds,
            event: binding.event,
            playbackMode: DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
            version: CURRENT_DIALOGUE_EVENT_BINDING_VERSION,
          },
  )

export type DialogueSegment = z.infer<typeof dialogueSegmentSchema>
export type DialogueSegmentMood = z.infer<typeof dialogueSegmentMoodSchema>
export type PDialogue = z.infer<typeof focusRoomDialogueSchema>
export type DialogueEventId = z.infer<typeof dialogueEventIdSchema>
export type DialogueEventPlaybackMode = z.infer<typeof dialogueEventPlaybackModeSchema>
