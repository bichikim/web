import {z} from 'zod'

import {SUPERTONIC_LANGUAGES, type SupertonicLanguage} from '../supertonic/language'
import {MOOD_MODIFIER_IDS, PRIMARY_MOOD_IDS} from '../text-mood/labels'

export const DEFAULT_FOCUS_ROOM_DIALOGUE_LANGUAGE = 'ko' satisfies SupertonicLanguage

export const FOCUS_ROOM_DIALOGUE_EVENTS = [
  'room-enter',
  'focus-start',
  'focus-end',
  'break-start',
  'break-end',
] as const
export const FOCUS_ROOM_ENTRY_EVENT = 'room-enter' as const
export const dialogueEventIdSchema = z.enum(FOCUS_ROOM_DIALOGUE_EVENTS)

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

const dialogueSegmentSchema = z.object({
  durationMs: z.number().nonnegative(),
  index: z.number().int().nonnegative(),
  mood: dialogueSegmentMoodSchema.optional(),
  startMs: z.number().nonnegative(),
  text: z.string().min(1),
})

export const focusRoomDialogueSchema = z.object({
  audioKey: z.string().min(1),
  createdAt: z.string().datetime(),
  durationMs: z.number().nonnegative(),
  id: z.string().min(1),
  language: z.enum(SUPERTONIC_LANGUAGES).default(DEFAULT_FOCUS_ROOM_DIALOGUE_LANGUAGE),
  modelId: z.enum(['full', 'int8']),
  segments: z.array(dialogueSegmentSchema).min(1).readonly(),
  text: z.string().min(1),
  updatedAt: z.string().datetime(),
  version: z.literal(1),
  voiceId: z.enum(['Yuna', 'F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5']),
})

const legacyDialogueEventBindingSchema = z.object({
  dialogueId: z.string().min(1),
  event: dialogueEventIdSchema,
  version: z.literal(1),
})
const currentDialogueEventBindingSchema = z.object({
  dialogueIds: z.array(z.string().min(1)).min(1).readonly(),
  event: dialogueEventIdSchema,
  version: z.literal(2),
})

export type DialogueEventBinding = z.infer<typeof currentDialogueEventBindingSchema>

export const dialogueEventBindingSchema = z
  .union([legacyDialogueEventBindingSchema, currentDialogueEventBindingSchema])
  .transform(
    (binding): DialogueEventBinding =>
      binding.version === 1
        ? {dialogueIds: [binding.dialogueId], event: binding.event, version: 2}
        : binding,
  )

export type DialogueSegment = z.infer<typeof dialogueSegmentSchema>
export type DialogueSegmentMood = z.infer<typeof dialogueSegmentMoodSchema>
export type PDialogue = z.infer<typeof focusRoomDialogueSchema>
export type DialogueEventId = z.infer<typeof dialogueEventIdSchema>
