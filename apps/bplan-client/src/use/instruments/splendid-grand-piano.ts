import {HUNDRED} from '@winter-love/utils'
import {
  CacheStorage,
  DrumMachine,
  SplendidGrandPiano,
  type SplendidGrandPianoConfig,
} from 'smplr'
import {Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {AudioContext as StandardizedAudioContext} from 'standardized-audio-context'
import {createEmitter, EmitterListener} from './emiter'

export type SampleStart = Parameters<DrumMachine['start']>[0]

export type MountStart = SampleStart & {
  id: string
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
  playing: boolean
  playingId: string
  totalTime: number
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

  mount(sample: MountStart): StopFn

  resume(): void

  stop(): void

  suspend(): void

  up(key: number | string): void
}

export type StopFn = (time?: number) => any

export interface SampleStop {
  stopId?: string | number
  time?: number
}

export interface ExtendedSampleStart extends SampleStart {
  [PLAY_STARTED_AT_KEY]?: number
  [TARGET_ID_KEY]?: string
  [USER_PLAY_FLAG_KEY]?: boolean
}

interface StartOptions {
  id?: string
  isUserStart?: boolean
}

export const createSplendidGrandPiano = (
  // options: Omit<SplendidGrandPianoOptions, 'onEnded' | 'onStart'> = {},
  options: Omit<SplendidGrandPianoOptions, 'onEnded' | 'onStart'> = {},
): [Accessor<SplendidGrandPianoState>, SplendidGrandPianoController] => {
  const {onEmitInstrument} = options
  const [state, setState] = createSignal<SplendidGrandPianoState>({
    leftTime: 0,
    loaded: false,
    playing: false,
    playingId: '',
    totalTime: 0,
  })
  let _splendidGrandPiano: SplendidGrandPiano | undefined
  let _audioContext: AudioContext | undefined

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

  const handelEnded = (payload: ExtendedSampleStart) => {
    if (payload[USER_PLAY_FLAG_KEY]) {
      return
    }
    const id = payload.stopId
    if (id === undefined) {
      return
    }
    onEmitInstrument?.(new Set([String(id)]), false, true)
    const {playingId} = state()
    // emitAllIds(new Set([String(id)]), false, true)
    if (!_splendidGrandPiano || playingId !== payload[TARGET_ID_KEY]) {
      return
    }
    setState((prevState) => ({
      ...prevState,
      leftTime:
        (payload.time ?? 0) -
        (payload[PLAY_STARTED_AT_KEY] ?? 0) +
        (payload.duration ?? 0),
    }))
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

  createEffect(() => {
    if (_audioContext) {
      return
    }
    const storage = new CacheStorage()
    const audioContext: AudioContext = new StandardizedAudioContext() as any
    const splendidGrandPiano = new SplendidGrandPiano(audioContext, {
      ...options,
      // baseUrl: '/instruments/splendid-grand-piano',
      onEnded: handelEnded,
      onStart: handleStart,
      storage,
    })
    _audioContext = audioContext

    splendidGrandPiano.load.then(() => {
      _splendidGrandPiano = splendidGrandPiano
      setState((prev) => ({
        ...prev,
        loaded: true,
      }))
    })

    onCleanup(() => {
      splendidGrandPiano.stop()
      _splendidGrandPiano = undefined
    })
  })

  const start = (payload: SampleStart, options: StartOptions = {}): StopFn => {
    const {id = '', isUserStart = false} = options
    const piano = _splendidGrandPiano
    if (!piano) {
      return () => null
    }
    setState((prev) => ({...prev, leftTime: 0, playingId: id}))
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

  const controller: SplendidGrandPianoController = {
    ...emitter,
    down(key: string | number): StopFn {
      return start({note: key}, {isUserStart: true})
    },
    mount(sample: MountStart): StopFn {
      return start(sample, {id: sample.id})
    },
    resume() {
      const piano = _splendidGrandPiano
      if (!piano) {
        return
      }
      return piano.context.resume()
    },
    stop() {
      const piano = _splendidGrandPiano
      if (!piano) {
        return
      }
      piano.stop()
    },
    suspend() {
      const piano = _splendidGrandPiano
      if (!piano) {
        return
      }
      return piano.context.suspend()
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
