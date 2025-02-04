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
  CHANNEL_NAME_KEY,
  createSplendidGrandPianoExtended,
  ExtendedSampleStart,
  ORIGINAL_NOTE_KEY,
  PlayOptions as PlayOptionsExtended,
  SplendidGrandPianoExtended,
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

  const handelEnded = (payload: ExtendedSampleStart) => {
    if (payload[USER_PLAY_FLAG_KEY]) {
      return
    }

    const id = payload[ORIGINAL_NOTE_KEY]

    if (id === undefined) {
      return
    }

    onEmitInstrument?.(new Set([String(id)]), {
      channelName: payload[CHANNEL_NAME_KEY],
      isDown: false,
      renderOnly: true,
    })
  }

  const handleStart = (payload: ExtendedSampleStart) => {
    if (payload[USER_PLAY_FLAG_KEY]) {
      return
    }
    const id = payload[ORIGINAL_NOTE_KEY]

    if (id === undefined) {
      return
    }

    onEmitInstrument?.(new Set([String(id)]), {
      channelName: payload[CHANNEL_NAME_KEY],
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

  const createChannelPiano = (audioContext: AudioContext): SplendidGrandPianoExtended => {
    return createSplendidGrandPianoExtended(audioContext, {
      ...options,
      onEnded: handelEnded,
      onStart: handleStart,
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
      const playablePiano = createChannelPiano(_audioContext)

      _playablePiano = playablePiano

      _playablePiano.load.then(() => {
        if (isCleanup()) {
          return
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

  const stop = () => {
    getPlayAblePiano().stop()
  }

  const suspend = () => {
    getPlayAblePiano().suspend()

    setState((prev) => ({
      ...prev,
      suspended: true,
    }))
  }

  const resume = (time?: number) => {
    getPlayAblePiano().resume(time)

    setState((prev) => ({
      ...prev,
      suspended: false,
    }))
  }

  const play = (payload: PlayOptions) => {
    const {id, midi, totalDuration} = payload

    if (!midi || !_audioContext) {
      return
    }

    stop()

    const piano = getPlayAblePiano()

    for (const [channelName, notes] of midi.entries()) {
      piano.play({
        channelName,
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

  const seek = (time: number) => {
    getPlayAblePiano().seek(time)

    setState((prev) => ({
      ...prev,
      playedTime: time,
    }))
  }

  const down = (key: string | number | SampleStart): StopFn => {
    return getPlayAblePiano().down(key)
  }

  const up = (key: string | number) => {
    return getPlayAblePiano().up(key)
  }

  const controller: SplendidGrandPianoController = {
    ...emitter,
    down,
    play,
    resume,
    seek,
    stop,
    suspend,
    up,
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
