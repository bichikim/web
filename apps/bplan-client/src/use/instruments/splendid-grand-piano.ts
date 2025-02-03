import {getWindow} from '@winter-love/utils'
import {DrumMachine, type SplendidGrandPianoConfig} from 'smplr'
import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import {getAudioContext} from 'src/use/instruments/prepare-audio-context'
import {createEmitter, EmitterListener} from './emitter'
import {useIsCleanup} from '@winter-love/solid-use'
import {
  createSplendidGrandPianoExtended,
  PLAY_STARTED_AT_KEY,
  PlayOptions as PlayOptionsExtended,
  SplendidGrandPianoExtended,
  TARGET_ID_KEY,
  USER_PLAY_FLAG_KEY,
} from './splendid-grand-piano-extended'
import {OnEmitInstrumentPayload} from 'src/components/real-button/use-global-touch'

export type SampleStart = Parameters<DrumMachine['start']>[0]

export interface PlayOptions extends Omit<PlayOptionsExtended, 'notes'> {
  id: string
  midi?: SampleStart[][]
  totalDuration: number
}

export type SplendidGrandPianoOptions = Partial<
  Omit<SplendidGrandPianoConfig, 'notesToLoad' | 'baseUrl'>
> & {
  onEmitInstrument?(ids: Set<string>, payload: OnEmitInstrumentPayload): void
}

export type PianoEvent = 'start' | 'end'

const UPDATE_LEFT_TIME_INTERVAL = 250

export interface SplendidGrandPianoState {
  leftTime: number
  loaded: boolean
  playedTime: number
  playingId: string
  startedAt: number
  suspended: boolean
  totalDuration: number
}

export interface SplendidGrandPianoController
  extends EmitterListener<
    PianoEvent,
    {
      end: SampleStart
      start: SampleStart
    }
  > {
  down(key: number | string | SampleStart): StopFn
  play(options: PlayOptions, startFrom?: number): void
  resume(): void
  seek(time: number): void
  stop(): void
  suspend(): void
  up(key: number | string): void
}

export type StopFn = (time?: number) => any

export interface ExtendedSampleStart extends SampleStart {
  [PLAY_STARTED_AT_KEY]?: number
  [TARGET_ID_KEY]?: string
  [USER_PLAY_FLAG_KEY]?: boolean
}

export type SplendidGrandPianoContextProps = [
  Accessor<SplendidGrandPianoState>,
  SplendidGrandPianoController,
]

const PLAY_ABLE_CHANNEL_NAME = 'default'

// eslint-disable-next-line max-lines-per-function
export const createSplendidGrandPiano = (
  options: Omit<SplendidGrandPianoOptions, 'onEnded' | 'onStart'> = {},
): [Accessor<SplendidGrandPianoState>, SplendidGrandPianoController] => {
  const _audioContext = getAudioContext()

  let _playablePiano: SplendidGrandPianoExtended | undefined

  const _autoPianoMap: Map<string | number, SplendidGrandPianoExtended> = new Map()

  const {onEmitInstrument} = options

  const [state, setState] = createSignal<SplendidGrandPianoState>({
    leftTime: 0,
    loaded: false,
    playedTime: 0,
    playingId: '',
    startedAt: 0,
    suspended: false,
    totalDuration: 0,
  })
  const isCleanup = useIsCleanup()

  const emitter = createEmitter<
    PianoEvent,
    {
      end: SampleStart
      start: SampleStart
    }
  >(
    (event) => {
      return `piano-${event}`
    },
    ['start', 'end'],
  )

  const isEnd = createMemo(() => state().leftTime <= 0)

  const isPlaying = createMemo(
    () => state().playingId !== '' && !state().suspended && !isEnd(),
  )

  const handelEnded = (payload: ExtendedSampleStart, channelName: string | number) => {
    if (payload[USER_PLAY_FLAG_KEY]) {
      return
    }
    const id = payload.stopId

    if (id === undefined) {
      return
    }

    onEmitInstrument?.(new Set([String(id)]), {
      channelName,
      isDown: false,
      renderOnly: true,
    })
  }

  const handleStart = (payload: ExtendedSampleStart, channelName: string | number) => {
    if (payload[USER_PLAY_FLAG_KEY]) {
      return
    }
    const id = payload.stopId

    if (id === undefined) {
      return
    }

    onEmitInstrument?.(new Set([String(id)]), {
      channelName,
      isDown: true,
      renderOnly: true,
    })
  }

  const handleStateChange = (event: Event) => {
    const {target} = event

    if (target) {
      const {state} = target as unknown as AudioContext

      if (state === 'suspended') {
        setState((prevState) => ({...prevState, playingId: '', suspended: false}))
      }
    }
  }

  const updateLeftTime = () => {
    const piano = _autoPianoMap.get(PLAY_ABLE_CHANNEL_NAME)

    if (!piano) {
      return
    }

    setState((prevState) => {
      return {
        ...prevState,
        leftTime: piano.getLeftTime(),
        playedTime: piano.getPlayedTime(),
      }
    })
  }

  /**
   * The createEffect below tracks and updates playback time.
   *
   * - Updates leftTime at UPDATE_LEFT_TIME_INTERVAL intervals when isPlaying() is true
   * - Calculates current playback time based on startedAt and totalDuration
   * - Cleans up interval when playback ends or isPlaying() becomes false
   * - Uses cleanup function to clear interval when component unmounts
   */
  createEffect(() => {
    let cleanupFlag: any

    if (isPlaying()) {
      // Using setInterval instead of requestAnimationFrame to keep playback running in background
      cleanupFlag = setInterval(updateLeftTime, UPDATE_LEFT_TIME_INTERVAL)
    } else {
      clearInterval(cleanupFlag)
    }

    onCleanup(() => {
      clearTimeout(cleanupFlag)
    })

    return isPlaying()
  })

  const createChannelPiano = (
    audioContext: AudioContext,
    channelName: string | number,
  ): SplendidGrandPianoExtended => {
    return createSplendidGrandPianoExtended(audioContext, {
      ...options,
      onEnded: (payload) => handelEnded(payload, channelName),
      onStart: (payload) => handleStart(payload, channelName),
    })
  }

  /**
   * The createEffect below handles piano loading and initialization.
   *
   * - Only loads the piano when window is open
   * - Does nothing when window is not open
   * - If another component unmounts during piano loading, stops piano and removes event listeners
   */
  createEffect(() => {
    untrack(() => {
      const window = getWindow()

      if (!window || !_audioContext || isCleanup()) {
        return
      }
      const playablePiano = createChannelPiano(_audioContext, PLAY_ABLE_CHANNEL_NAME)

      _playablePiano = playablePiano

      _playablePiano.load.then(() => {
        if (isCleanup()) {
          return
        }

        if (_playablePiano) {
          console.log('start')
          _playablePiano.__original.context.resume()
          _playablePiano.start({note: 'C4'})
        }

        // eslint-disable-next-line max-nested-callbacks
        setState((prev) => ({
          ...prev,
          loaded: true,
        }))
      })
    })

    onCleanup(() => {
      _playablePiano?.stop()

      for (const piano of _autoPianoMap.values()) {
        piano.stop()
      }

      _audioContext?.removeEventListener('statechange', handleStateChange)
      _autoPianoMap.clear()
      _playablePiano = undefined
    })
  })

  const getPlayAblePiano = (): SplendidGrandPianoExtended => {
    if (!_playablePiano) {
      throw new Error('Play able Piano not found')
    }

    return _playablePiano
  }

  const stopAutoPiano = () => {
    for (const piano of _autoPianoMap.values()) {
      piano.stop()
    }
  }

  const suspendAutoPiano = () => {
    for (const piano of _autoPianoMap.values()) {
      piano.suspend()
    }

    setState((prev) => ({
      ...prev,
      suspended: true,
    }))
  }

  const resumeAutoPiano = (time?: number) => {
    for (const piano of _autoPianoMap.values()) {
      piano.resume(time)
    }

    setState((prev) => ({
      ...prev,
      suspended: false,
    }))
  }

  const playAutoPiano = (payload: PlayOptions) => {
    const {id, midi, totalDuration} = payload

    if (!midi || !_audioContext) {
      return
    }

    stopAutoPiano()

    const oldPianoMap = new Map(_autoPianoMap)

    _autoPianoMap.clear()
    const piano = getPlayAblePiano()

    for (const [channelName, notes] of midi.entries()) {
      // if (piano) {
      //   _autoPianoMap.set(channelName, piano)
      // } else {
      //   piano = createChannelPiano(_audioContext, channelName)
      //   _autoPianoMap.set(channelName, piano)
      // }

      piano.play({
        id,
        notes,
        totalDuration,
      })
    }

    setState((prev) => ({
      ...prev,
      leftTime: totalDuration,
      playedTime: 0,
      playingId: id,
      suspended: false,
      totalDuration,
    }))
  }

  const seekPlayerPiano = (time: number) => {
    for (const piano of _autoPianoMap.values()) {
      piano.seek(time)
    }

    setState((prev) => ({
      ...prev,
      playedTime: time,
    }))
  }

  const downPlayablePiano = (key: string | number | SampleStart): StopFn => {
    return getPlayAblePiano().down(key)
  }

  const upPlayablePiano = (key: string | number) => {
    return getPlayAblePiano().up(key)
  }

  const controller: SplendidGrandPianoController = {
    ...emitter,
    down: downPlayablePiano,
    play: playAutoPiano,
    resume: resumeAutoPiano,
    seek: seekPlayerPiano,
    stop: stopAutoPiano,
    suspend: suspendAutoPiano,
    up: upPlayablePiano,
  }

  return [state, controller]
}

export const SplendidGrandPianoContext = createContext<SplendidGrandPianoContextProps>([
  () =>
    ({
      leftTime: 0,
      loaded: false,
      playedTime: 0,
      playingId: '',
      startedAt: 0,
      suspended: false,
      totalDuration: 0,
    }) satisfies SplendidGrandPianoState,
  {
    addEventListener: () => {
      //
    },
    // eslint-disable-next-line unicorn/consistent-function-scoping
    down: () => () => null,
    play: () => Promise.resolve(),
    removeEventListener: () => {
      //
    },
    resume: () => {
      //
    },
    seek: () => {
      //
    },
    stop: () => {
      //
    },
    suspend: () => {
      //
    },
    up: () => {
      //
    },
  },
])

export {type SplendidGrandPiano} from 'smplr'
