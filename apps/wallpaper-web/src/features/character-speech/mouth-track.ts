import {MOUTH_TRACK_STEP} from './configuration'
import {createSpeechMouth} from './mouth'
import type {MouthPose, SpeechAudio, SpeechMouthTrack} from './types'

const CHANNELS = 2
export const MOUTH_DURATION_TOLERANCE = 0.05

export const parseMouthTrack = (value: unknown): SpeechMouthTrack | null => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('duration' in value) ||
    !('step' in value) ||
    !('frames' in value)
  ) {
    return null
  }
  if (
    typeof value.duration !== 'number' ||
    !Number.isFinite(value.duration) ||
    value.duration <= 0 ||
    typeof value.step !== 'number' ||
    !Number.isFinite(value.step) ||
    value.step <= 0
  ) {
    return null
  }
  const data = value.frames
  const samples =
    data instanceof Float32Array
      ? data
      : Array.isArray(data) && data.every((frame: unknown) => typeof frame === 'number')
        ? Float32Array.from(data)
        : null
  if (
    samples === null ||
    samples.length !== (Math.ceil(value.duration / value.step) + 1) * CHANNELS ||
    !samples.every(
      (frame, index) =>
        Number.isFinite(frame) && frame >= (index % CHANNELS === 0 ? 0 : -1) && frame <= 1,
    )
  ) {
    return null
  }
  return {duration: value.duration, frames: samples, step: value.step}
}

export const createMouthTrack = (audio: SpeechAudio, text: string): SpeechMouthTrack => {
  const duration = audio.samples.length / audio.sampleRate
  const count = Math.ceil(duration / MOUTH_TRACK_STEP) + 1
  const frames = new Float32Array(count * CHANNELS)
  const sample = createSpeechMouth(audio, text)
  for (let frame = 0; frame < count; frame += 1) {
    const pose = sample(frame * MOUTH_TRACK_STEP)
    frames[frame * CHANNELS] = pose.open
    frames[frame * CHANNELS + 1] = pose.form
  }
  return {duration, frames, step: MOUTH_TRACK_STEP}
}

export const sampleMouthTrack = (track: SpeechMouthTrack, time: number): MouthPose => {
  if (time < 0 || time >= track.duration) {
    return {form: 0, open: 0}
  }
  const position = time / track.step
  const frame = Math.floor(position)
  const offset = frame * CHANNELS
  const progress = position - frame
  const open = track.frames[offset] ?? 0
  const form = track.frames[offset + 1] ?? 0
  return {
    form: form + ((track.frames[offset + CHANNELS + 1] ?? 0) - form) * progress,
    open: open + ((track.frames[offset + CHANNELS] ?? 0) - open) * progress,
  }
}
