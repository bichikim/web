import {LIP_SYNC_SHAPES, type LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'
import type {LipSyncOutput, LipSyncWeights} from '../lipsync/types'
import {analyzeSpeechFrame} from './analyze-speech-frame'
import type {VoiceAudio} from './synthesis'
import {createMouthMotion} from './create-mouth-motion'

interface PlaybackClip {
  readonly audio: VoiceAudio
  readonly start: number
  readonly speed: number
  readonly onStart?: () => void
  started: boolean
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
const FORM_SECONDS = 0.025
const SILENT_LEVEL = 0.005
const announceStart = (clip: PlaybackClip) => {
  if (!clip.started) {
    clip.started = true
    clip.onStart?.()
  }
}
const blendWeights = (
  shown: LipSyncWeights,
  target: LipSyncWeights,
  response: number,
): LipSyncWeights =>
  Object.fromEntries(
    LIP_SYNC_SHAPES.map((shape) => [
      shape,
      (shown[shape] ?? 0) + ((target[shape] ?? 0) - (shown[shape] ?? 0)) * response,
    ]),
  )
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
  let paused = false
  let previous = options.clock()
  let level = 0
  let shown: LipSyncWeights = {}
  let formed: LipSyncWeights = {}
  const motion = createMouthMotion()
  let analysis: {clip: PlaybackClip; index: number; weights: LipSyncWeights} | null = null
  const reset = () => {
    cancelAnimationFrame(frame)
    frame = 0
    level = 0
    shown = {}
    formed = {}
    analysis = null
    motion.reset()
    options.onLevel(0)
    options.onShape?.(null, 0)
  }
  const stop = () => {
    clips.clear()
    reset()
  }
  const relax = (clock: number): boolean => {
    const tail = motion.relax(clock)
    if (tail === null) {
      return false
    }
    options.onShape?.(null, 0, tail.weights, {motion: tail.motion, openingWeights: {}})
    return true
  }
  const shape = (active: PlaybackClip, clock: number, seconds: number) => {
    const elapsed = (clock - active.start) * active.speed
    const index = Math.floor(elapsed / ANALYSIS_SECONDS)
    if (analysis?.clip !== active || analysis.index !== index) {
      analysis = {clip: active, index, weights: analyzeSpeechFrame(active.audio, elapsed)}
    }
    const smoothing = 1 - Math.exp(-seconds / SHAPING_SECONDS)
    const {weights} = analysis
    shown = blendWeights(shown, weights, smoothing)
    const pose = motion.update({
      audio: active.audio,
      clock,
      elapsed,
      fallback: weights,
      speed: active.speed,
    })
    const target = pose.weights
    const response = 1 - Math.exp(-seconds / FORM_SECONDS)
    formed = blendWeights(formed, target, response)
    const strongest = LIP_SYNC_SHAPES.reduce<LipSyncShape>(
      (best, candidate) => ((formed[candidate] ?? 0) > (formed[best] ?? 0) ? candidate : best),
      'a',
    )
    options.onShape?.(
      (formed[strongest] ?? 0) > 0 ? strongest : null,
      level < SILENT_LEVEL ? 0 : level,
      formed,
      {
        motion: pose.motion,
        openingWeights: pose.closure ? blendWeights(shown, {closed: 1}, pose.closure) : shown,
      },
    )
  }
  const step = () => {
    frame = 0
    if (paused) {
      return
    }
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
    const enabled = options.onShape !== undefined && (options.enabled?.() ?? true)
    if (active !== undefined) {
      announceStart(active)
    }
    if (enabled && active !== undefined) {
      shape(active, clock, seconds)
    } else if (!enabled || !relax(clock)) {
      shown = {}
      formed = {}
      analysis = null
      if (!enabled || clips.size === 0) {
        motion.reset()
      }
      options.onShape?.(null, 0)
    }
    if (clips.size > 0 || motion.relax(clock) !== null) {
      frame = requestAnimationFrame(step)
    }
  }
  return {
    dispose: stop,
    setPaused: (value: boolean) => {
      paused = value
      if (value) {
        reset()
      } else if (clips.size > 0 && frame === 0) {
        previous = options.clock()
        frame = requestAnimationFrame(step)
      }
    },
    stop,
    track: (audio: VoiceAudio, start: number, speed: number, onStart?: () => void) => {
      const clip = {audio, onStart, speed, start, started: false}
      clips.add(clip)
      if (frame === 0 && !paused) {
        previous = options.clock()
        frame = requestAnimationFrame(step)
      }
      return (reason: 'ended' | 'cancelled' = 'cancelled') => {
        if (reason === 'ended') {
          announceStart(clip)
        }
        clips.delete(clip)
        if (clips.size === 0) {
          if (reason === 'ended' && !paused && motion.finish(options.clock())) {
            level = 0
            shown = {}
            analysis = null
            options.onLevel(0)
            if (frame === 0) {
              frame = requestAnimationFrame(step)
            }
          } else {
            reset()
          }
        }
      }
    },
  }
}
