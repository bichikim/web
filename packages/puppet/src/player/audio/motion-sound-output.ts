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

/** Plays motion sounds into `destination` in step with the motions' timelines. */
export const createMotionSoundOutput = (destination: AudioNode): MotionSoundOutput => {
  const {context} = destination
  const buffers = new WeakMap<PuppetSound, AudioBuffer>()
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
    release(key)
    const gain = context.createGain()
    gain.connect(destination)
    const source = context.createBufferSource()
    source.buffer = getBuffer(sound)
    source.playbackRate.value = rate
    source.connect(gain)
    source.start(0, frame.time)
    voices.set(key, {gain, offset: frame.time, rate, sound, source, startedAt: context.currentTime})
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
        if (sound !== undefined && rate > 0 && frame.time < sound.mono.length / sound.sampleRate) {
          active.add(key)
          const voice = voices.get(key)
          const position =
            voice === undefined
              ? undefined
              : voice.offset + (context.currentTime - voice.startedAt) * voice.rate
          if (
            voice === undefined ||
            voice.sound !== sound ||
            voice.rate !== rate ||
            Math.abs((position ?? 0) - frame.time) > MOTION_SOUND_DRIFT
          ) {
            start(key, sound, frame, rate)
          }
          voices.get(key)!.gain.gain.value = frame.weight
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
