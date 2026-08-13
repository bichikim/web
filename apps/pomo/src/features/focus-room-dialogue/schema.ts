import {z} from 'zod'

export const FOCUS_ROOM_ENTRY_EVENT = 'room-enter' as const

const dialogueSegmentSchema = z.object({
  durationMs: z.number().nonnegative(),
  index: z.number().int().nonnegative(),
  startMs: z.number().nonnegative(),
  text: z.string().min(1),
})

export const focusRoomDialogueSchema = z.object({
  audioKey: z.string().min(1),
  createdAt: z.string().datetime(),
  durationMs: z.number().nonnegative(),
  id: z.string().min(1),
  modelId: z.enum(['full', 'int8']),
  segments: z.array(dialogueSegmentSchema).min(1).readonly(),
  text: z.string().min(1),
  updatedAt: z.string().datetime(),
  version: z.literal(1),
  voiceId: z.enum(['Yuna', 'F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5']),
})

export const dialogueEventBindingSchema = z.object({
  dialogueId: z.string().min(1),
  event: z.literal(FOCUS_ROOM_ENTRY_EVENT),
  version: z.literal(1),
})

export type DialogueSegment = z.infer<typeof dialogueSegmentSchema>
export type FocusRoomDialogue = z.infer<typeof focusRoomDialogueSchema>
export type DialogueEventBinding = z.infer<typeof dialogueEventBindingSchema>
