import {getWindow, HUNDRED} from '@winter-love/utils'
import {
  CacheStorage,
  DrumMachine,
  SplendidGrandPiano,
  type SplendidGrandPianoConfig,
} from 'smplr'
import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from 'solid-js'
import {getAudioContext} from 'src/use/instruments/prepare-audio-context'
import {createEmitter, EmitterListener} from './emitter'
import {useIsCleanup} from '@winter-love/solid-use'
import {
  createSplendidGrandPianoExtended,
  PlayOptions as PlayOptionsExtended,
  SplendidGrandPianoExtended,
} from './splendid-grand-piano-extended'

export type SampleStart = Parameters<DrumMachine['start']>[0]

export interface PlayOptions extends Omit<PlayOptionsExtended, 'notes'> {
  id: string
  midi?: SampleStart[][]
  totalDuration: number
}

export interface OnEmitInstrumentPayload {
  channelName: string | number
  isDown: boolean
  renderOnly?: boolean
}

export type SplendidGrandPianoOptions = Partial<
  Omit<SplendidGrandPianoConfig, 'notesToLoad' | 'baseUrl'>
> & {
  onEmitInstrument?(ids: Set<string>, payload: OnEmitInstrumentPayload): void
}

export type PianoEvent = 'start' | 'end'

const UPDATE_LEFT_TIME_INTERVAL = 250
export const PLAY_STARTED_AT_KEY = Symbol('play-started-at')
export const TARGET_ID_KEY = Symbol('play-started-at')
export const USER_PLAY_FLAG_KEY = Symbol('user-play')

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

interface StartOptions {
  id?: string
  isUserStart?: boolean
}

export type SplendidGrandPianoContextProps = [
  Accessor<SplendidGrandPianoState>,
  SplendidGrandPianoController,
]

const PLAY_ABLE_CHANNEL_NAME = 'default'

// eslint-disable-next-line max-lines-per-function
export const createSplendidGrandPiano = (
  options: Omit<SplendidGrandPianoOptions, 'onEnded' | 'onStart'> = {},
): SplendidGrandPianoController => {
  const _audioContext = getAudioContext()

  let _splendidPlayablePiano: SplendidGrandPianoExtended | undefined

  const _splendidGrandPianoMap: Map<string | number, SplendidGrandPianoExtended> =
    new Map()

  let _currentMidi: SampleStart[][] = []
  let _suspendedTime = 0

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
  const hasPlayingItem = createMemo(() => state().playingId !== '')

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

    const updateLeftTime = () => {
      const piano = _splendidGrandPianoMap.get(PLAY_ABLE_CHANNEL_NAME)

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
    const window = getWindow()

    if (!window || !_audioContext || isCleanup()) {
      return
    }

    _audioContext.addEventListener('statechange', handleStateChange)
    _splendidPlayablePiano = createChannelPiano(_audioContext, PLAY_ABLE_CHANNEL_NAME)

    onCleanup(() => {
      _splendidPlayablePiano?.stop()

      for (const piano of _splendidGrandPianoMap.values()) {
        piano.stop()
      }

      _audioContext?.removeEventListener('statechange', handleStateChange)
      _splendidGrandPianoMap.clear()
      _splendidPlayablePiano = undefined
    })
  })

  // const _start = (payload: SampleStart, options: StartOptions = {}): StopFn => {
  //   const {id = '', isUserStart = false} = options
  //   const piano = _splendidGrandPiano

  //   if (!piano) {
  //     return () => null
  //   }

  //   const {time = 0, velocity = 1} = payload

  //   return piano.start({
  //     ...payload,
  //     [PLAY_STARTED_AT_KEY]: piano.context.currentTime,
  //     [TARGET_ID_KEY]: id,
  //     [USER_PLAY_FLAG_KEY]: isUserStart,
  //     time: time + piano.context.currentTime,
  //     velocity: velocity * HUNDRED,
  //   } as any)
  // }

  // const _seek = (time: number) => {
  //   const piano = _splendidGrandPiano

  //   if (!piano) {
  //     return
  //   }

  //   piano.stop()
  //   _resume(time)
  // }

  // const _resume = (suspendedTime: number) => {
  //   for (const notes of _currentMidi) {
  //     const leftNotesIndex = notes.findIndex((note) => {
  //       return suspendedTime < (note.time ?? 0)
  //     })

  //     if (leftNotesIndex !== -1) {
  //       const leftNotes = notes.slice(leftNotesIndex).map((note) => {
  //         return {
  //           ...note,
  //           time: (note.time ?? 0) - suspendedTime,
  //         }
  //       })

  //       for (const note of leftNotes) {
  //         _start(note)
  //       }
  //     }
  //   }
  // }

  const getPlayAblePiano = (): SplendidGrandPianoExtended => {
    if (!_splendidPlayablePiano) {
      throw new Error('Play able Piano not found')
    }

    return _splendidPlayablePiano
  }

  const stopAllPiano = () => {
    for (const piano of _splendidGrandPianoMap.values()) {
      piano.stop()
    }
  }

  const suspendAllPiano = () => {
    for (const piano of _splendidGrandPianoMap.values()) {
      piano.suspend()
    }
  }

  const resumeAllPiano = (time?: number) => {
    for (const piano of _splendidGrandPianoMap.values()) {
      piano.resume(time)
    }

    setState((prev) => ({
      ...prev,
      suspended: false,
    }))
  }

  const playMultipleChannel = (payload: PlayOptions) => {
    const {id, midi, totalDuration} = payload

    if (!midi || !_audioContext) {
      return
    }

    stopAllPiano()

    const oldPianoMap = new Map(_splendidGrandPianoMap)

    _splendidGrandPianoMap.clear()

    for (const [channelName, notes] of midi.entries()) {
      let piano = oldPianoMap.get(channelName)

      if (piano) {
        _splendidGrandPianoMap.set(channelName, piano)
      } else {
        piano = createChannelPiano(_audioContext, channelName)
        _splendidGrandPianoMap.set(channelName, piano)
      }

      piano.play({
        id,
        notes,
        totalDuration: 0,
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

  const controller: SplendidGrandPianoController = {
    ...emitter,
    down(key: string | number | SampleStart): StopFn {
      return getPlayAblePiano().down(key)
    },
    play: playMultipleChannel,
    resume(time?: number) {
      resumeAllPiano(time)

      setState((prev) => ({
        ...prev,
        suspended: false,
      }))
    },
    seek(time: number) {
      const piano = _splendidGrandPiano

      if (!piano) {
        return
      }

      const {suspended} = state()

      setState((prev) => ({
        ...prev,
        playedTime: time,
      }))

      if (suspended) {
        _suspendedTime = time

        return
      }

      _seek(time)
    },
    stop() {
      const piano = _splendidGrandPiano

      if (!piano || !hasPlayingItem()) {
        return
      }

      setState((prev) => ({
        ...prev,
        leftTime: 0,
        playingId: '',
        suspended: false,
        totalDuration: 0,
      }))
      _currentMidi = []
      piano.stop()
    },
    suspend() {
      const piano = _splendidGrandPiano

      if (!piano) {
        return
      }

      setState((prev) => ({
        ...prev,
        suspended: true,
      }))
      _suspendedTime = piano.context.currentTime - state().startedAt

      return piano.stop()
    },
    up(key: string | number) {
      const piano = _splendidGrandPiano

      if (!piano) {
        return
      }

      piano.stop(key)
    },
  }

  return [state, controller]
}

export const SplendidGrandPianoContext = createContext<SplendidGrandPianoContextProps>([
  () =>
    ({
      leftTime: 0,
      loaded: false,
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
