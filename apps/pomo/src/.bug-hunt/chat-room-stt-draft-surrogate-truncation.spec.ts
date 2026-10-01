/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {MAXIMUM_DRAFT_LENGTH} from '../components/chat-room/shared'
import {appendSpeechTranscript} from '../features/speech-to-text/transcript'

/** Mirrors ChatRoom speech-to-text draft updates. */
const applySpeechTranscriptToDraft = (currentDraft: string, transcript: string) =>
  appendSpeechTranscript(currentDraft, transcript).slice(0, MAXIMUM_DRAFT_LENGTH)

describe('ChatRoom STT draft length limit', () => {
  it('should not produce an ill-formed UTF-16 string when truncating at the draft limit', () => {
    const draft = 'a'.repeat(MAXIMUM_DRAFT_LENGTH - 2)
    const nextDraft = applySpeechTranscriptToDraft(draft, '😀')

    expect(nextDraft.length).toBe(MAXIMUM_DRAFT_LENGTH)
    expect(nextDraft.isWellFormed()).toBe(true)
  })
})
