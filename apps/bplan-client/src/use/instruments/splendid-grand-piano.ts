import {getWindow, HUNDRED} from '@winter-love/utils'
import {
  CacheStorage,
  DrumMachine,
  SplendidGrandPiano,
  type SplendidGrandPianoConfig,
} from 'smplr'
import {Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import {getAudioContext} from 'src/use/instruments/prepare-audio-context'
import {createEmitter, EmitterListener} from './emiter'

export type SampleStart = Parameters<DrumMachine['start']>[0]

export interface PlayOptions {
  id: string
  midi?: SampleStart[][]
  totalDuration: number
}

export type SplendidGrandPianoOptions = Partial<
  Omit<SplendidGrandPianoConfig, 'notesToLoad' | 'baseUrl'>
> & {
  onEmitInstrument?(ids: Set<string>, isDown: boolean, renderOnly?: boolean): void
}

export type PianoEvent = 'start' | 'end'
export const PLAY_STARTED_AT_KEY = Symbol('play-started-at')
export const TARGET_ID_KEY = Symbol('play-started-at')
export const USER_PLAY_FLAG_KEY = Symbol('user-play')

export interface SplendidGrandPianoState {
  leftTime: number
  loaded: boolean
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
  down(key: number | string): StopFn
  play(options: PlayOptions, startFrom?: number): Promise<void>
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

// eslint-disable-next-line max-lines-per-function
export const createSplendidGrandPiano = (
  options: Omit<SplendidGrandPianoOptions, 'onEnded' | 'onStart'> = {},
): [Accessor<SplendidGrandPianoState>, SplendidGrandPianoController] => {
  const {onEmitInstrument} = options
  const [state, setState] = createSignal<SplendidGrandPianoState>({
    leftTime: 0,
    loaded: false,
    playingId: '',
    startedAt: 0,
    suspended: false,
    totalDuration: 0,
  })
  let _splendidGrandPiano: SplendidGrandPiano | undefined
  let _cleanup = false
  let _currentMidi: SampleStart[][] = []
  let _suspendedTime = 0
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
  const isPlaying = createMemo(
    () =>
      state().playingId !== '' &&
      !state().suspended &&
      state().leftTime < state().totalDuration,
  )
  const hasPlayingItem = createMemo(() => state().playingId !== '')

  const handelEnded = (payload: ExtendedSampleStart) => {
    if (payload[USER_PLAY_FLAG_KEY]) {
      return
    }

    const id = payload.stopId

    if (id === undefined) {
      return
    }

    onEmitInstrument?.(new Set([String(id)]), false, true)
  }

  const handleStart = (payload: ExtendedSampleStart) => {
    if (payload[USER_PLAY_FLAG_KEY]) {
      return
    }

    const id = payload.stopId

    if (id === undefined) {
      return
    }

    onEmitInstrument?.(new Set([String(id)]), true, true)
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

  createEffect(() => {
    let cleanupFlag: any
    const updateLeftTime = () => {
      if (!_splendidGrandPiano) {
        return
      }

      const {startedAt, totalDuration} = state()
      const leftTime = _splendidGrandPiano.context.currentTime - startedAt
      const isEnd = leftTime >= totalDuration

      setState((prevState) => {
        return {
          ...prevState,
          leftTime,
          // playingId: isEnd ? '' : prevState.playingId,
        }
      })

      if (isPlaying() && !isEnd) {
        cleanupFlag = requestAnimationFrame(updateLeftTime)
      }
    }

    if (isPlaying()) {
      cleanupFlag = requestAnimationFrame(updateLeftTime)
    }

    onCleanup(() => {
      cancelAnimationFrame(cleanupFlag)
    })

    return isPlaying()
  })

  createEffect(() => {
    const window = getWindow()

    if (!window) {
      return
    }

    let splendidGrandPiano: SplendidGrandPiano | undefined
    let _audioContext: AudioContext | undefined
    const prepare = (audioContext: AudioContext | void) => {
      if (!audioContext || _cleanup) {
        return
      }

      _audioContext = audioContext
      audioContext.addEventListener('statechange', handleStateChange)
      const storage = new CacheStorage()

      splendidGrandPiano = new SplendidGrandPiano(audioContext, {
        ...options,
        // baseUrl: '/instruments/splendid-grand-piano',
        onEnded: handelEnded,
        onStart: handleStart,
        storage,
      })
      _audioContext = audioContext

      splendidGrandPiano.load.then(() => {
        if (_cleanup) {
          return
        }

        _splendidGrandPiano = splendidGrandPiano
        setState((prev) => ({
          ...prev,
          loaded: true,
        }))
      })
    }

    prepare(getAudioContext())

    onCleanup(() => {
      splendidGrandPiano?.stop()
      _audioContext?.removeEventListener('statechange', handleStateChange)
      _splendidGrandPiano = undefined
    })
  })

  onCleanup(() => {
    _cleanup = true
  })

  const _start = (payload: SampleStart, options: StartOptions = {}): StopFn => {
    const {id = '', isUserStart = false} = options
    const piano = _splendidGrandPiano

    if (!piano) {
      return () => null
    }

    const {time = 0, velocity = 1} = payload

    return piano.start({
      ...payload,
      [PLAY_STARTED_AT_KEY]: piano.context.currentTime,
      [TARGET_ID_KEY]: id,
      [USER_PLAY_FLAG_KEY]: isUserStart,
      time: time + piano.context.currentTime,
      velocity: velocity * HUNDRED,
    } as any)
  }

  const _seek = (time: number) => {
    const piano = _splendidGrandPiano

    if (!piano) {
      return
    }

    piano.stop()
    _resume(time)
  }

  const _resume = (suspendedTime: number) => {
    for (const notes of _currentMidi) {
      const leftNotesIndex = notes.findIndex((note) => {
        return suspendedTime < (note.time ?? 0)
      })

      if (leftNotesIndex !== -1) {
        const leftNotes = notes.slice(leftNotesIndex).map((note) => {
          return {
            ...note,
            time: (note.time ?? 0) - suspendedTime,
          }
        })

        for (const note of leftNotes) {
          _start(note)
        }
      }
    }
  }

  const controller: SplendidGrandPianoController = {
    ...emitter,
    down(key: string | number): StopFn {
      return _start({note: key}, {isUserStart: true})
    },
    async play(options: PlayOptions) {
      const piano = _splendidGrandPiano
      const {id, totalDuration, midi} = options

      if (!midi || !piano) {
        return
      }

      piano.stop()
      setState((prev) => ({
        ...prev,
        leftTime: 0,
        playingId: id,
        startedAt: piano.context.currentTime,
        suspended: false,
        totalDuration,
      }))
      await piano.context.resume()
      _currentMidi = midi

      for (const notes of midi) {
        for (const note of notes) {
          _start(note)
        }
      }
    },
    resume() {
      const piano = _splendidGrandPiano

      if (!piano) {
        return
      }

      _resume(_suspendedTime)
      setState((prev) => ({
        ...prev,
        startedAt: piano.context.currentTime - _suspendedTime,
        suspended: false,
      }))
      _suspendedTime = 0
    },
    seek(time: number) {
      const piano = _splendidGrandPiano

      if (!piano) {
        return
      }

      const {suspended} = state()

      setState((prev) => ({
        ...prev,
        leftTime: time,
        startedAt: suspended ? prev.startedAt : piano.context.currentTime - time,
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

export {type SplendidGrandPiano} from 'smplr'
