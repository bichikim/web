import type {SupertonicAudioChunk} from '../supertonic'
import {createPVisemeTrack, getPCoarticulatedVisemeAtTime, type PViseme} from '../lip-sync'
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

export interface DialogueSegmentPosition {
  readonly position: number
  readonly text: string
}

/** Resolves a persisted or legacy text-derived mouth shape against dialogue playback time. */
export const getDialogueVisemeAtTime = (
  segments: ReadonlyArray<DialogueSegment>,
  currentTimeMs: number,
): PViseme => {
  const segment = segments.find(
    (candidate) =>
      currentTimeMs >= candidate.startMs &&
      currentTimeMs < candidate.startMs + candidate.durationMs,
  )

  if (segment === undefined) {
    return 'rest'
  }

  const visemes =
    segment.visemes ?? createPVisemeTrack({durationMs: segment.durationMs, text: segment.text})
  return getPCoarticulatedVisemeAtTime(visemes, currentTimeMs - segment.startMs)
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
    const segment = {
      durationMs,
      index,
      startMs,
      text,
      visemes: createPVisemeTrack({durationMs, text}),
    }
    startMs += durationMs

    if (index < options.audioChunks.length - 1) {
      startMs += silenceMs
    }

    return segment
  })

  return {durationMs: startMs, segments}
}

/** Returns the latest segment whose audio has started, including pauses before the next segment. */
export const getDialoguePositionAtTime = (
  segments: ReadonlyArray<DialogueSegment>,
  currentTimeMs: number,
): DialogueSegmentPosition | null => {
  let activePosition: DialogueSegmentPosition | null = null
  let position = 0

  for (const segment of segments) {
    if (segment.startMs > currentTimeMs) {
      return activePosition
    }

    activePosition = {position, text: segment.text}
    position += 1
  }

  return activePosition
}

/** Returns the latest line whose audio has started, including pauses before the next line. */
export const getDialogueTextAtTime = (
  segments: ReadonlyArray<DialogueSegment>,
  currentTimeMs: number,
): string | null => getDialoguePositionAtTime(segments, currentTimeMs)?.text ?? null
