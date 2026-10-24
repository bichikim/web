import type {MotionFrame} from '../playback/types'
import type {PuppetSound} from './decode-wav'

/** Seconds the audio may drift from the motion time before it restarts at the motion time. */
export const MOTION_SOUND_DRIFT = 0.15

interface Voice {
  readonly gain: GainNode
  /** Sound seconds at `startedAt`. */
  readonly offset: number
  readonly rate: number
  readonly sound: PuppetSound
  readonly source: AudioBufferSourceNode
  readonly startedAt: number
}

export interface MotionSoundOutput {
  /** Plays the frames' sounds at their motion times; stops sounds that no frame plays. */
  sync(frames: ReadonlyArray<MotionFrame>, getSound: (src: string) => PuppetSound | undefined): void
  stop(): void
}

const toAudioBuffer = (context: BaseAudioContext, sound: PuppetSound) => {
  const buffer = context.createBuffer(
    sound.channels.length,
    Math.max(1, sound.mono.length),
    sound.sampleRate,
  )
  for (const [index, channel] of sound.channels.entries()) {
    buffer.copyToChannel(channel, index)
  }
  return buffer
}

/**
 * Plays motion sounds into `destination` in step with the motions' timelines. A sound the audio
 * context refuses is reported once through `onError` and skipped; the mouth still follows it.
 */
export const createMotionSoundOutput = (
  destination: AudioNode,
  onError?: (src: string) => void,
): MotionSoundOutput => {
  const {context} = destination
  const buffers = new WeakMap<PuppetSound, AudioBuffer>()
  const refused = new WeakSet<PuppetSound>()
  const voices = new Map<string, Voice>()
  const getBuffer = (sound: PuppetSound) => {
    const cached = buffers.get(sound)
    if (cached !== undefined) {
      return cached
    }
    const buffer = toAudioBuffer(context, sound)
    buffers.set(sound, buffer)
    return buffer
  }
  const release = (key: string) => {
    const voice = voices.get(key)
    voices.delete(key)
    voice?.source.stop()
    voice?.gain.disconnect()
  }
  const start = (key: string, sound: PuppetSound, frame: MotionFrame, rate: number) => {
    // The buffer comes first: a refused sound must not leave a connected node behind.
    const buffer = getBuffer(sound)
    release(key)
    const gain = context.createGain()
    gain.connect(destination)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate
    source.connect(gain)
    source.start(0, frame.time)
    voices.set(key, {gain, offset: frame.time, rate, sound, source, startedAt: context.currentTime})
  }
  /** Keeps `key`'s voice playing `sound` at the frame; false when the context refused it. */
  const keepVoice = (key: string, sound: PuppetSound, frame: MotionFrame, rate: number) => {
    const voice = voices.get(key)
    // A suspended context's clock stands still, so its drift says nothing about the voice.
    const drifted =
      voice !== undefined &&
      context.state === 'running' &&
      Math.abs(voice.offset + (context.currentTime - voice.startedAt) * voice.rate - frame.time) >
        MOTION_SOUND_DRIFT
    if (voice === undefined || voice.sound !== sound || voice.rate !== rate || drifted) {
      try {
        start(key, sound, frame, rate)
      } catch {
        refused.add(sound)
        return false
      }
    }
    const soundOptions = frame.motion.sound
    const volume = soundOptions?.volume ?? (soundOptions?.analysis === 'rms' ? 'source' : 'motion')
    voices.get(key)!.gain.gain.value = volume === 'source' ? 1 : frame.weight
    return true
  }
  return {
    stop() {
      for (const key of voices.keys()) {
        release(key)
      }
    },
    sync(frames, getSound) {
      const seen = new Map<string, number>()
      const active = new Set<string>()
      for (const frame of frames) {
        const src = frame.motion.sound?.src
        const sound = src === undefined ? undefined : getSound(src)
        const rate = frame.rate ?? 0
        // Two playbacks of one motion get separate voices.
        const occurrence = seen.get(frame.motion.id) ?? 0
        seen.set(frame.motion.id, occurrence + 1)
        const key = `${frame.motion.id}#${occurrence}`
        const sounding =
          src !== undefined &&
          sound !== undefined &&
          !refused.has(sound) &&
          rate > 0 &&
          frame.time < sound.mono.length / sound.sampleRate
        if (sounding && keepVoice(key, sound, frame, rate)) {
          active.add(key)
        } else if (sounding) {
          onError?.(src)
        }
      }
      for (const key of voices.keys()) {
        if (!active.has(key)) {
          release(key)
        }
      }
    },
  }
}
