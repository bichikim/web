/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {dialogueEventBindingSchema, focusRoomDialogueSchema} from '../schema'
import {SUPERTONIC_MODELS, SUPERTONIC_VOICES} from '../../supertonic/model'

const baseDialogue = {
  audioKey: 'audio-key',
  createdAt: '2026-08-15T00:00:00.000Z',
  durationMs: 1000,
  id: 'dialogue-id',
  modelId: 'full',
  text: '반가워!',
  updatedAt: '2026-08-15T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
} as const

describe('focusRoomDialogueSchema', () => {
  it.each(SUPERTONIC_MODELS)('should preserve the registered $id model', ({id}) => {
    const dialogue = focusRoomDialogueSchema.parse({
      ...baseDialogue,
      modelId: id,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '반가워!'}],
    })

    expect(dialogue.modelId).toBe(id)
  })

  it.each(['unknown', ' full ', null, undefined, 0])(
    'should reject an unsupported model %s at its field',
    (modelId) => {
      const result = focusRoomDialogueSchema.safeParse({
        ...baseDialogue,
        modelId,
        segments: [{durationMs: 1000, index: 0, startMs: 0, text: '반가워!'}],
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues).toEqual([
        expect.objectContaining({
          code: 'invalid_value',
          path: ['modelId'],
          values: ['full', 'int8'],
        }),
      ])
    },
  )

  it.each(SUPERTONIC_VOICES)('should preserve the registered $id voice', ({id}) => {
    expect(
      focusRoomDialogueSchema.parse({
        ...baseDialogue,
        segments: [{durationMs: 1000, index: 0, startMs: 0, text: '반가워!'}],
        voiceId: id,
      }).voiceId,
    ).toBe(id)
  })

  it.each(['default', 'Sarah', 'yuna', ' Yuna ', null])(
    'should reject an unregistered voice %s at its field',
    (voiceId) => {
      const result = focusRoomDialogueSchema.safeParse({
        ...baseDialogue,
        segments: [{durationMs: 1000, index: 0, startMs: 0, text: '반가워!'}],
        voiceId,
      })
      expect(result.success).toBe(false)
      expect(result.error?.issues).toEqual([
        {code: 'custom', message: 'Invalid input', path: ['voiceId']},
      ])
    },
  )

  it('should migrate a stored dialogue without a language to Korean', () => {
    const dialogue = focusRoomDialogueSchema.parse({
      ...baseDialogue,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '반가워!'}],
    })

    expect(dialogue.language).toBe('ko')
  })

  it('should preserve a selected language including the neutral option', () => {
    const dialogue = focusRoomDialogueSchema.parse({
      ...baseDialogue,
      language: 'na',
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: 'Hello!'}],
    })

    expect(dialogue.language).toBe('na')
  })

  it('should preserve the selected Hana voice', () => {
    const dialogue = focusRoomDialogueSchema.parse({
      ...baseDialogue,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '반가워!'}],
      voiceId: 'Hana',
    })

    expect(dialogue.voiceId).toBe('Hana')
  })

  it('should keep legacy segments valid when mood is absent', () => {
    const dialogue = focusRoomDialogueSchema.parse({
      ...baseDialogue,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '반가워!'}],
    })

    expect(dialogue.segments[0]).not.toHaveProperty('mood')
  })

  it('should preserve the complete mood analysis on a segment', () => {
    const mood = {
      margin: 0.5,
      modifiers: [
        {active: true, id: 'playful', probability: 0.7, threshold: 0.5},
        {active: false, id: 'sarcastic', probability: 0.1, threshold: 0.5},
      ],
      primary: {id: 'cheerful', probability: 0.75},
      scores: [
        {id: 'cheerful', probability: 0.75},
        {id: 'hopeful', probability: 0.25},
      ],
      secondary: {id: 'hopeful', probability: 0.25},
      uncertain: false,
    } as const
    const dialogue = focusRoomDialogueSchema.parse({
      ...baseDialogue,
      segments: [{durationMs: 1000, index: 0, mood, startMs: 0, text: '반가워!'}],
    })

    expect(dialogue.segments[0].mood).toEqual(mood)
  })
})

describe('dialogueEventBindingSchema', () => {
  it.each([
    [{dialogueId: 'first', event: 'room-enter', version: 1}],
    [{dialogueIds: ['first', 'second'], event: 'focus-start', version: 2}],
  ])('should migrate version %s bindings to sequential playback', (storedBinding) => {
    expect(dialogueEventBindingSchema.parse(storedBinding)).toMatchObject({
      playbackMode: 'sequential-all',
      version: 3,
    })
  })

  it('should preserve the selected playback mode', () => {
    expect(
      dialogueEventBindingSchema.parse({
        dialogueIds: ['first', 'second'],
        event: 'break-start',
        playbackMode: 'random-one',
        version: 3,
      }),
    ).toEqual({
      dialogueIds: ['first', 'second'],
      event: 'break-start',
      playbackMode: 'random-one',
      version: 3,
    })
  })

  it('should accept a long break event binding', () => {
    expect(
      dialogueEventBindingSchema.parse({
        dialogueIds: ['first'],
        event: 'long-break-start',
        playbackMode: 'sequential-all',
        version: 3,
      }),
    ).toMatchObject({event: 'long-break-start'})
  })

  it('should accept a random event binding', () => {
    expect(
      dialogueEventBindingSchema.parse({
        dialogueIds: ['first'],
        event: 'random',
        playbackMode: 'random-one',
        version: 3,
      }),
    ).toMatchObject({event: 'random'})
  })

  it('should accept an action-only delayed end binding', () => {
    expect(
      dialogueEventBindingSchema.parse({
        actionIds: ['music-stop', 'music-start', 'sound-effects-stop', 'sound-effects-start'],
        dialogueIds: [],
        event: 'delayed-end',
        playbackMode: 'sequential-all',
        version: 3,
      }),
    ).toEqual({
      actionIds: ['music-stop', 'music-start', 'sound-effects-stop', 'sound-effects-start'],
      dialogueIds: [],
      event: 'delayed-end',
      playbackMode: 'sequential-all',
      version: 3,
    })
  })
})
