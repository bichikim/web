import type {createRuntimeEffects} from '../create-runtime-effects'
import type {MotionPlayback, MotionPlaybackOptions} from '../playback/types'
import type {Player, PlayerPlaybackOptions} from '../player-types'
import {pickGroupMotion} from '../motion-groups'
import type {CreateRuntimePlayerOptions} from './types'
interface CreatePlaybackCommandsOptions extends Pick<
  CreateRuntimePlayerOptions,
  'state' | 'effects' | 'refresh' | 'syncTicker'
> {}

const completionOptions = <
  T extends {
    readonly onComplete?: () => void
  },
>(
  effects: ReturnType<typeof createRuntimeEffects>,
  settings: T,
  repeat = false,
) => {
  const completion = effects.register(settings.onComplete, {repeat})
  return {...settings, completion, onComplete: undefined}
}
const playMotion = (
  options: CreatePlaybackCommandsOptions,
  motionId: string,
  settings: PlayerPlaybackOptions = {},
) => {
  const {state, effects, refresh} = options
  const {playback} = state
  if (state.destroyed) {
    return false
  }
  const configured = completionOptions(effects, settings)
  const previous = playback.capture().completion
  try {
    if (!playback.playMotion(motionId, configured)) {
      effects.cancel(configured.completion)
      return false
    }
  } catch (cause) {
    effects.cancel(configured.completion)
    throw cause
  }
  effects.cancel(previous)
  refresh()
  return true
}
const startMotion = (
  options: CreatePlaybackCommandsOptions,
  motionId: string,
  settings: MotionPlaybackOptions = {},
): MotionPlayback | undefined => {
  const {state, effects} = options
  const {playbacks} = state
  if (state.destroyed) {
    return undefined
  }
  const configured = completionOptions(effects, settings, true)
  let handle: MotionPlayback | undefined
  try {
    handle = playbacks.start(motionId, configured)
  } catch (cause) {
    effects.cancel(configured.completion)
    throw cause
  }
  if (handle === undefined) {
    effects.cancel(configured.completion)
    return undefined
  }
  return {
    ...handle,
    stop() {
      effects.cancel(configured.completion)
      handle.stop()
    },
  }
}
export const createPlaybackCommands = (
  options: CreatePlaybackCommandsOptions,
): Pick<
  Player,
  | 'pause'
  | 'play'
  | 'playGroup'
  | 'playMotion'
  | 'resume'
  | 'seek'
  | 'setMotion'
  | 'setPlaybackSpeed'
  | 'startMotion'
  | 'stop'
> => {
  const {state, effects, refresh, syncTicker} = options
  const {playback, playbacks, notices, random} = state
  const setMotion = (motionId: string) => {
    if (state.destroyed) {
      return false
    }
    const previousCompletion = playback.capture().completion
    const selection = playback.select(motionId)
    switch (selection) {
      case 'changed':
        effects.cancel(previousCompletion)
        // A pose the new motion selects starts fading.
        refresh()
        return true
      case 'unchanged':
        return true
      case 'missing':
        return false
      default: {
        const exhaustive: never = selection
        throw new Error(`Unknown motion selection: ${exhaustive}`)
      }
    }
  }
  const resume = () => {
    if (!state.destroyed) {
      playback.resume()
      playbacks.resume()
      syncTicker()
    }
  }
  return {
    pause() {
      if (state.destroyed) {
        return
      }
      playback.pause()
      playbacks.pause()
      // The frame stops sounding motions too, even when the ticker stops after this.
      refresh()
    },
    play(playbackOptions = {}) {
      if (state.destroyed) {
        return
      }
      const configured = completionOptions(effects, playbackOptions)
      const previous = playback.capture().completion
      let activating: boolean
      try {
        activating = playback.play(configured)
      } catch (cause) {
        effects.cancel(configured.completion)
        throw cause
      }
      effects.cancel(previous)
      if (activating) {
        refresh()
      }
      syncTicker()
    },
    playGroup(group, settings) {
      const motion = state.destroyed ? undefined : pickGroupMotion(state.document, group, random)
      return motion !== undefined && playMotion(options, motion.id, settings)
        ? motion.id
        : undefined
    },
    playMotion: (id, settings) => playMotion(options, id, settings),
    resume,
    seek(time: number) {
      if (state.destroyed) {
        return
      }
      playback.seek(time)
      refresh()
    },
    setMotion,
    setPlaybackSpeed(speed) {
      playback.setSpeed(speed)
      refresh()
    },
    startMotion: (id, settings) => startMotion(options, id, settings),
    stop() {
      if (state.destroyed) {
        return
      }
      playback.stop()
      playbacks.stop()
      effects.clear()
      notices.clear()
      refresh()
    },
  }
}
