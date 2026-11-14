import {
  MOUTH_REST_THRESHOLD,
  VISEME_MOUTH_POSES as POSES,
} from '@winter-love/wallpaper/lipsync/mouth-poses'
import {createVisemeTrack, getCoarticulatedVisemeAtTime} from '@winter-love/supertonic/visemes'
import type {MouthPose, SpeechAudio} from './types'

const FRAME_SECONDS = 0.02
const REFERENCE_FLOOR = 0.0001
const PEAK_PERCENTILE = 0.9
const SILENCE_RATIO = 0.08
const MILLISECONDS_PER_SECOND = 1000
const OPEN_SECONDS = 0.035
const CLOSE_SECONDS = 0.09
const FORM_SECONDS = 0.06

const createEnvelope = (audio: SpeechAudio) => {
  const hop = Math.max(1, Math.round(audio.sampleRate * FRAME_SECONDS))
  const levels = Array.from({length: Math.ceil(audio.samples.length / hop)}, (_, frame) => {
    const start = frame * hop
    const end = Math.min(audio.samples.length, start + hop * 2)
    let power = 0
    for (let index = start; index < end; index += 1) {
      power += audio.samples[index]! ** 2
    }
    return Math.sqrt(power / Math.max(1, end - start))
  })
  const sorted = [...levels].sort((first, second) => first - second)
  const reference = Math.max(
    REFERENCE_FLOOR,
    sorted[Math.floor(sorted.length * PEAK_PERCENTILE)] ?? 0,
  )
  return levels.map((level) =>
    Math.min(1, Math.max(0, (level / reference - SILENCE_RATIO) / (1 - SILENCE_RATIO))),
  )
}

/** Pomo's text cues plus PCM envelope, fitted to Ash's open/form mouth parameters. */
export const createSpeechMouth = (audio: SpeechAudio, text: string) => {
  const duration = audio.samples.length / audio.sampleRate
  const cues = createVisemeTrack({durationMs: duration * MILLISECONDS_PER_SECOND, text})
  const envelope = createEnvelope(audio)
  let shown: MouthPose = {form: 0, open: 0}
  let previous = 0
  return (time: number): MouthPose => {
    const elapsed = Math.max(0, time - previous)
    previous = time
    const position = Math.max(0, time / FRAME_SECONDS)
    const index = Math.floor(position)
    const first = envelope[index] ?? 0
    const level = first + ((envelope[index + 1] ?? 0) - first) * (position - index)
    const viseme = getCoarticulatedVisemeAtTime(cues, time * MILLISECONDS_PER_SECOND)
    const pose = POSES[viseme]
    const target = time < 0 || time >= duration ? 0 : pose.open * level
    const opening = 1 - Math.exp(-elapsed / (target > shown.open ? OPEN_SECONDS : CLOSE_SECONDS))
    const shaping = 1 - Math.exp(-elapsed / FORM_SECONDS)
    shown = {
      form: shown.form + ((level > MOUTH_REST_THRESHOLD ? pose.form : 0) - shown.form) * shaping,
      open: shown.open + (target - shown.open) * opening,
    }
    return shown
  }
}
