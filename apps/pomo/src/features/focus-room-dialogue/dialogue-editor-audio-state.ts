import {createSignal} from 'solid-js'

import type {GeneratedDialogueAudio} from './generate-dialogue-audio'
import type {DialogueSegment} from './schema'

export const createDialogueEditorAudioState = () => {
  const [segments, setSegments] = createSignal<ReadonlyArray<DialogueSegment>>([])
  const [durationMs, setDurationMs] = createSignal(0)
  const [audioUrl, setAudioUrl] = createSignal<string | null>(null)
  const [editableAudio, setEditableAudio] = createSignal<GeneratedDialogueAudio | null>(null)
  const [regeneratingSegmentIndex, setRegeneratingSegmentIndex] = createSignal<number | null>(null)
  return {
    audioUrl,
    durationMs,
    editableAudio,
    regeneratingSegmentIndex,
    segments,
    setAudioUrl,
    setDurationMs,
    setEditableAudio,
    setRegeneratingSegmentIndex,
    setSegments,
  }
}
