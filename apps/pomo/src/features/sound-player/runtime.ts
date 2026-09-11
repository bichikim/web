import type {Player} from 'tone'
import {createCrossfadeBuffer, resolveLoopPosition} from './crossfade'
import type {SoundRuntime, SoundVoice, VoiceOptions, VoiceSettings} from './types'

const VOLUME_RAMP_SECONDS = 0.05

/** Loads the browser audio runtime without registering a device media session. */
export async function createSoundRuntime(): Promise<SoundRuntime> {
  const tone = await import('tone')
  return {
    createVoice: (options) =>
      createVoice(new tone.Player().toDestination(), options, tone.gainToDb),
    now: () => tone.now(),
    resume: () => tone.start(),
  }
}

function createVoice(
  player: Player,
  options: VoiceOptions,
  gainToDb: (gain: number) => number,
): SoundVoice {
  let original: AudioBuffer | undefined
  let overlap: number | undefined
  let offset = 0
  let startedAt = 0
  let finished = false
  let active = false
  let disposed = false
  const position = (time: number) => {
    const elapsed = offset + Math.max(0, time - startedAt)
    return player.loop
      ? resolveLoopPosition({
          duration: player.buffer.duration,
          loopStart: Number(player.loopStart),
          position: elapsed,
        })
      : Math.min(elapsed, player.buffer.duration)
  }
  player.onstop = () => {
    // Tone updates source state after invoking onstop; a restarted source must remain active.
    queueMicrotask(() => {
      if (disposed || !active || player.loop || player.state === 'started') {
        return
      }
      active = false
      finished = true
      options.onEnded()
    })
  }
  const configure = (settings: VoiceSettings) => {
    player.mute = !settings.enabled
    player.volume.rampTo(gainToDb(settings.volume), VOLUME_RAMP_SECONDS)
    const source = original
    const nextOverlap = settings.loop ? settings.overlapSeconds : 0
    if (source === undefined || (overlap === nextOverlap && player.loop === settings.loop)) {
      return
    }
    const buffer =
      nextOverlap === 0
        ? source
        : createCrossfadeBuffer({buffer: source, overlapSeconds: nextOverlap})
    const time = player.now()
    const playing = active && player.state === 'started'
    if (playing) {
      offset = position(time)
      player.stop(time)
    }
    player.buffer.set(buffer)
    player.loopStart = Math.round(nextOverlap * source.sampleRate) / source.sampleRate
    player.loopEnd = source.duration
    player.loop = settings.loop
    overlap = nextOverlap
    if (playing) {
      startedAt = time
      player.start(time, offset)
    }
  }
  return {
    configure,
    dispose: () => {
      disposed = true
      active = false
      player.dispose()
      original = undefined
    },
    get finished() {
      return finished
    },
    load: async (source) => {
      await player.load(source)
      if (disposed) {
        return
      }
      original = player.buffer.get()
      if (original === undefined || !Number.isFinite(original.duration) || original.duration <= 0) {
        throw new Error('재생할 수 있는 오디오가 아닙니다.')
      }
    },
    pause: (time) => {
      if (!active || finished) {
        return
      }
      offset = position(time)
      active = false
      player.stop(time)
    },
    play: (time, resume) => {
      if (resume && finished) {
        return
      }
      if (finished) {
        offset = 0
        finished = false
      }
      startedAt = time
      active = true
      player.start(time, offset)
    },
    stop: () => {
      active = false
      player.stop()
      offset = 0
      finished = false
    },
  }
}
