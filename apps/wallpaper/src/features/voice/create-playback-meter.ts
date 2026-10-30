import {LIP_SYNC_SHAPES, type LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'
import type {LipSyncOutput, LipSyncWeights} from '../lipsync/types'
import {analyzeSpeechFrame} from './analyze-speech-frame'
import type {VoiceAudio} from './synthesis'

interface PlaybackClip {
  readonly audio: VoiceAudio
  readonly start: number
  readonly speed: number
}
interface PlaybackMeterOptions {
  readonly enabled?: () => boolean
  readonly clock: () => number
  readonly onLevel: (level: number) => void
  readonly onShape?: LipSyncOutput
}
const WINDOW_SECONDS = 0.04
const AMPLITUDE_GAIN = 6
const OPEN_SECONDS = 0.035
const CLOSE_SECONDS = 0.09
const ANALYSIS_SECONDS = 0.03
const SHAPING_SECONDS = 0.06
const SILENT_LEVEL = 0.005
const clipLevel = (clip: PlaybackClip, clock: number): number => {
  const offset = Math.floor((clock - clip.start) * clip.speed * clip.audio.sampleRate)
  if (offset < 0 || offset >= clip.audio.samples.length) {
    return 0
  }
  const end = Math.min(
    clip.audio.samples.length,
    offset + Math.ceil(clip.audio.sampleRate * WINDOW_SECONDS),
  )
  let power = 0
  for (let index = offset; index < end; index += 1) {
    power += clip.audio.samples[index]! ** 2
  }
  return Math.min(1, Math.sqrt(power / (end - offset)) * AMPLITUDE_GAIN)
}

/** Samples scheduled PCM against the audio clock, with fast opening and gradual closing. */
export const createPlaybackMeter = (options: PlaybackMeterOptions) => {
  const clips = new Set<PlaybackClip>()
  let frame = 0
  let previous = options.clock()
  let level = 0
  let shown: LipSyncWeights = {}
  let analysis: {clip: PlaybackClip; index: number; weights: LipSyncWeights} | null = null
  const reset = () => {
    cancelAnimationFrame(frame)
    frame = 0
    level = 0
    shown = {}
    analysis = null
    options.onLevel(0)
    options.onShape?.(null, 0)
  }
  const step = () => {
    frame = 0
    const clock = options.clock()
    const target = Math.max(0, ...Array.from(clips, (clip) => clipLevel(clip, clock)))
    const seconds = Math.max(0, clock - previous)
    const smoothing = target > level ? OPEN_SECONDS : CLOSE_SECONDS
    level = target + (level - target) * Math.exp(-seconds / smoothing)
    previous = clock
    options.onLevel(level < SILENT_LEVEL ? 0 : level)
    const active = Array.from(clips).find((clip) => {
      const elapsed = (clock - clip.start) * clip.speed
      return elapsed >= 0 && elapsed < clip.audio.samples.length / clip.audio.sampleRate
    })
    const elapsed = active === undefined ? 0 : (clock - active.start) * active.speed
    if (options.onShape !== undefined && active !== undefined && (options.enabled?.() ?? true)) {
      const index = Math.floor(elapsed / ANALYSIS_SECONDS)
      if (analysis?.clip !== active || analysis.index !== index) {
        analysis = {clip: active, index, weights: analyzeSpeechFrame(active.audio, elapsed)}
      }
      const smoothing = 1 - Math.exp(-seconds / SHAPING_SECONDS)
      const {weights} = analysis
      shown = Object.fromEntries(
        LIP_SYNC_SHAPES.map((shape) => [
          shape,
          (shown[shape] ?? 0) + ((weights[shape] ?? 0) - (shown[shape] ?? 0)) * smoothing,
        ]),
      )
      const strongest = LIP_SYNC_SHAPES.reduce<LipSyncShape>(
        (best, candidate) => ((shown[candidate] ?? 0) > (shown[best] ?? 0) ? candidate : best),
        'a',
      )
      options.onShape(
        (shown[strongest] ?? 0) > 0 ? strongest : null,
        level < SILENT_LEVEL ? 0 : level,
        shown,
      )
    } else {
      shown = {}
      analysis = null
      options.onShape?.(null, 0)
    }
    if (clips.size > 0) {
      frame = requestAnimationFrame(step)
    }
  }
  return {
    dispose: () => {
      clips.clear()
      reset()
    },
    track: (audio: VoiceAudio, start: number, speed: number) => {
      const clip = {audio, speed, start}
      clips.add(clip)
      if (frame === 0) {
        previous = options.clock()
        frame = requestAnimationFrame(step)
      }
      return () => {
        clips.delete(clip)
        if (clips.size === 0) {
          reset()
        }
      }
    },
  }
}
