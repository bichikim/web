// oxlint-disable no-await-in-loop -- Yield between bounded batches of acoustic frames.
import type {LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'
import type {LipSyncCue, LipSyncWeights} from '../lipsync/types'
import {speechShapes} from '../lipsync/speech-shapes'
import type {VoiceAudio} from './synthesis'
import {analyzeSpeechFrame} from './analyze-speech-frame'

interface AlignSpeechShapesOptions {
  readonly audio: VoiceAudio
  readonly text: string
  readonly signal?: AbortSignal
}
interface AcousticFrame {
  readonly time: number
  readonly weights: LipSyncWeights
  readonly power: number
}
const FRAME_SECONDS = 0.03
const WINDOW_SECONDS = 0.04
const ACTIVE_AMPLITUDE = 0.015
const BATCH_SIZE = 12
const MINIMUM_RATE = 8000
const TRANSITION_COST = 0.2
const POSITION_COST = 1.2
const ACOUSTIC_FLOOR = 0.08
const FRAME_CENTER = 0.5
const LETTERS_PER_SYLLABLE = 3
const CLOSURE_WEIGHT = 0.3
const MINIMUM_CLOSURE = 2
const MAXIMUM_CLOSURE = 3
const MINIMUM_VOWEL = 3
const CLOSURE_COST = 0.4
const yieldTask = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      channel.port2.close()
      resolve()
    }
    channel.port2.postMessage(null)
  })
const acousticFrames = async (options: AlignSpeechShapesOptions): Promise<AcousticFrame[]> => {
  const {audio, signal} = options
  const duration = audio.samples.length / audio.sampleRate
  const size = Math.round(audio.sampleRate * WINDOW_SECONDS)
  const frames: AcousticFrame[] = []
  let batch = 0
  for (let time = WINDOW_SECONDS / 2; time < duration; time += FRAME_SECONDS) {
    signal?.throwIfAborted()
    const start = Math.max(
      0,
      Math.min(audio.samples.length - size, Math.round(time * audio.sampleRate) - size / 2),
    )
    const samples = audio.samples.subarray(start, start + size)
    const power = samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length
    frames.push({
      power,
      time,
      weights: power > ACTIVE_AMPLITUDE * ACTIVE_AMPLITUDE ? analyzeSpeechFrame(audio, time) : {},
    })
    batch += 1
    if (batch === BATCH_SIZE) {
      batch = 0
      await yieldTask()
    }
  }
  signal?.throwIfAborted()
  return frames
}
interface AlignmentGrid {
  readonly count: number
  readonly scores: Float64Array
  readonly costs: readonly (readonly number[])[]
}
const alignmentCosts = (
  frames: readonly AcousticFrame[],
  shapes: readonly (LipSyncShape | null)[],
): readonly (readonly number[])[] => {
  const peak = Math.max(...frames.map((frame) => frame.power))
  const durations = shapes.map((shape) => (shape === 'closed' ? CLOSURE_WEIGHT : 1))
  const total = durations.reduce((sum, weight) => sum + weight, 0)
  let position = 0
  const positions = durations.map((weight) => {
    const center = (position + weight / 2) / total
    position += weight
    return center
  })
  return shapes.map((shape, state) => {
    const prefix = [0]
    for (const [index, frame] of frames.entries()) {
      const weight =
        shape === 'closed'
          ? 1 - Math.min(1, frame.power / peak)
          : shape === null
            ? Math.max(0, ...Object.values(frame.weights))
            : (frame.weights[shape] ?? 0)
      const distance = Math.abs(positions[state]! - (index + FRAME_CENTER) / frames.length)
      prefix.push(prefix.at(-1)! - Math.log(ACOUSTIC_FLOOR + weight) + distance * POSITION_COST)
    }
    return prefix
  })
}
const closurePath = (index: number, state: number, grid: AlignmentGrid) => {
  const prefix = grid.costs[state]!
  let best = {length: 0, score: Infinity}
  for (let length = MINIMUM_CLOSURE; length <= Math.min(MAXIMUM_CLOSURE, index + 1); length += 1) {
    const start = index - length + 1
    const previous =
      start === 0 && state === 0
        ? 0
        : start > 0 && state > 0
          ? grid.scores[(start - 1) * grid.count + state - 1]!
          : Infinity
    const score =
      previous + prefix[index + 1]! - prefix[start]! + TRANSITION_COST + length * CLOSURE_COST
    if (score < best.score) {
      best = {length, score}
    }
  }
  return best
}
const tracePath = (paths: Uint8Array, shapes: readonly (LipSyncShape | null)[]): number[] => {
  const count = shapes.length
  const aligned = Array.from({length: paths.length / count}, () => 0)
  let state = count - 1
  let index = aligned.length - 1
  while (index >= 0 && state >= 0) {
    const length = paths[index * count + state]!
    if (length > 0) {
      aligned.fill(state, index - length + 1, index + 1)
      index -= length
      state -= 1
    } else {
      aligned[index] = state
      index -= 1
    }
  }
  return aligned
}
const alignFrames = (
  frames: readonly AcousticFrame[],
  shapes: readonly (LipSyncShape | null)[],
): number[] => {
  const count = shapes.length
  const paths = new Uint8Array(frames.length * count)
  const scores = new Float64Array(frames.length * count).fill(Infinity)
  const costs = alignmentCosts(frames, shapes)
  const grid = {costs, count, scores}
  const vowelLength = shapes.includes('closed') ? MINIMUM_VOWEL : 1

  for (const index of frames.keys()) {
    for (const [state, shape] of shapes.entries()) {
      const cell = index * count + state
      const prefix = costs[state]!
      if (shape === 'closed') {
        const best = closurePath(index, state, grid)
        scores[cell] = best.score
        paths[cell] = best.length
      } else {
        const length = shape === null ? 1 : vowelLength
        const start = index - length + 1
        const stay = index > 0 ? scores[(index - 1) * count + state]! : Infinity
        const advance =
          start === 0 && state === 0
            ? 0
            : start > 0 && state > 0
              ? scores[(start - 1) * count + state - 1]! + TRANSITION_COST
              : Infinity
        const staying = stay + prefix[index + 1]! - prefix[index]!
        const advancing = start >= 0 ? advance + prefix[index + 1]! - prefix[start]! : Infinity
        scores[cell] = Math.min(staying, advancing)
        paths[cell] = advancing < staying ? length : 0
      }
    }
  }
  if (!Number.isFinite(scores.at(-1))) {
    return []
  }
  return tracePath(paths, shapes)
}
const shapeCues = (
  frames: readonly AcousticFrame[],
  shapes: readonly (LipSyncShape | null)[],
): readonly LipSyncCue[] => {
  if (frames.length < shapes.length) {
    return []
  }
  const aligned = alignFrames(frames, shapes)
  if (aligned.length === 0) {
    return []
  }
  const cues: LipSyncCue[] = []
  for (const [index, frame] of frames.entries()) {
    const shape = shapes[aligned[index]!]!
    const end = (frame.time + (frames[index + 1]?.time ?? frame.time + FRAME_SECONDS)) / 2
    const previous = cues.at(-1)
    if (previous?.shape === shape) {
      cues[cues.length - 1] = {...previous, end}
    } else {
      cues.push({end, shape, start: previous?.end ?? Math.max(0, frame.time - FRAME_SECONDS / 2)})
    }
  }
  return cues
}

/** Aligns Korean vowel and bounded bilabial closure poses to the generated speech. */
export const alignSpeechShapes = async (
  options: AlignSpeechShapesOptions,
): Promise<readonly LipSyncCue[]> => {
  options.signal?.throwIfAborted()
  if (options.audio.sampleRate < MINIMUM_RATE) {
    return []
  }
  const shapes = Array.from(options.text.matchAll(/[가-힣ᄀ-ᇿㅏ-ㅣ]+|[a-z\d]+/giu))
    .flatMap(([word]): (LipSyncShape | null)[] =>
      /^[a-z\d]/iu.test(word)
        ? Array.from(
            {length: Math.max(1, Math.ceil(word.length / LETTERS_PER_SYLLABLE))},
            () => null,
          )
        : speechShapes(word).filter((shape): shape is LipSyncShape => shape !== null),
    )
    .filter((shape, index, all) => shape === null || shape !== all[index - 1])
  if (!shapes.some((shape) => shape !== null)) {
    return []
  }
  await yieldTask()
  const frames = await acousticFrames(options)
  const active = frames.flatMap((frame, index) =>
    frame.power > ACTIVE_AMPLITUDE * ACTIVE_AMPLITUDE ? [index] : [],
  )
  if (active.length === 0) {
    return []
  }
  const voiced = active.map((index) => frames[index]!)
  if (!shapes.includes('closed')) {
    return shapeCues(voiced, shapes)
  }
  const padded = frames.slice(
    Math.max(0, active[0]! - MINIMUM_CLOSURE),
    active.at(-1)! + MINIMUM_CLOSURE + 1,
  )
  const cues = shapeCues(padded, shapes)
  const vowels = shapes
    .filter((shape) => shape !== 'closed')
    .filter((shape, index, all) => shape === null || shape !== all[index - 1])
  return cues.length > 0 ? cues : shapeCues(voiced, vowels)
}
