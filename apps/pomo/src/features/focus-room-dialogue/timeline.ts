import type {SupertonicAudioChunk} from '../supertonic'
import type {DialogueSegment} from './schema'

const MILLISECONDS_PER_SECOND = 1000

export interface CreateDialogueSegmentsOptions {
  readonly audioChunks: ReadonlyArray<SupertonicAudioChunk>
  readonly silenceDuration: number
  readonly textChunks: ReadonlyArray<string>
}

export interface DialogueTimeline {
  readonly durationMs: number
  readonly segments: ReadonlyArray<DialogueSegment>
}

/** Builds subtitle offsets from rendered PCM duration rather than synthesis elapsed time. */
export const createDialogueTimeline = (
  options: CreateDialogueSegmentsOptions,
): DialogueTimeline => {
  let startMs = 0
  const silenceMs = options.silenceDuration * MILLISECONDS_PER_SECOND
  const segments = options.audioChunks.map((audio, index) => {
    const text = options.textChunks[audio.index]

    if (text === undefined) {
      throw new Error(`Missing text for dialogue audio chunk ${audio.index}.`)
    }

    const durationMs = (audio.samples.length / audio.sampleRate) * MILLISECONDS_PER_SECOND
    const segment = {durationMs, index, startMs, text}
    startMs += durationMs

    if (index < options.audioChunks.length - 1) {
      startMs += silenceMs
    }

    return segment
  })

  return {durationMs: startMs, segments}
}

/** Returns the latest line whose audio has started, including pauses before the next line. */
export const getDialogueTextAtTime = (
  segments: ReadonlyArray<DialogueSegment>,
  currentTimeMs: number,
): string | null => {
  let activeText: string | null = null

  for (const segment of segments) {
    if (segment.startMs > currentTimeMs) {
      return activeText
    }

    activeText = segment.text
  }

  return activeText
}
