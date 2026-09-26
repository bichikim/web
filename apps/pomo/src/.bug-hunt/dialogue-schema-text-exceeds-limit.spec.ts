/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {focusRoomDialogueSchema} from '../features/focus-room-dialogue/schema'

const MAXIMUM_DIALOGUE_EDITOR_TEXT_LENGTH = 10_000

describe('focus room dialogue persistence schema', () => {
  it('should reject dialogue text longer than the editor maximum length', () => {
    const text = '가'.repeat(MAXIMUM_DIALOGUE_EDITOR_TEXT_LENGTH + 1)

    expect(() =>
      focusRoomDialogueSchema.parse({
        audioKey: 'audio-key',
        createdAt: '2026-08-13T00:00:00.000Z',
        durationMs: 1000,
        id: 'dialogue-id',
        language: 'ko',
        modelId: 'full',
        segments: [{durationMs: 1000, index: 0, startMs: 0, text: 'segment'}],
        text,
        updatedAt: '2026-08-13T00:00:00.000Z',
        version: 1,
        voiceId: 'Yuna',
      }),
    ).toThrow()
  })
})
