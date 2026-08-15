import {describe, expect, it} from 'vitest'

import {focusRoomDialogueSchema} from '../schema'

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
