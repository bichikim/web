import {
  CacheStorage,
  DrumMachine,
  SplendidGrandPiano,
  type SplendidGrandPianoConfig,
} from 'smplr'
import {HUNDRED} from '@winter-love/utils'

export type SplendidGrandPianoOptions = Partial<
  Omit<SplendidGrandPianoConfig, 'notesToLoad' | 'baseUrl' | 'storage'>
> & {
  onEnded?: (payload: ExtendedSampleStart) => void
  onStart?: (payload: ExtendedSampleStart) => void
}

export interface SplendidGrandPianoBunchOptions {
  initChannelCount?: number
}

export type SampleStart = Parameters<DrumMachine['start']>[0]

export const PLAY_STARTED_AT_KEY = Symbol('play-started-at')
export const TARGET_ID_KEY = Symbol('play-started-at')
export const USER_PLAY_FLAG_KEY = Symbol('user-play')

export type StopFn = (time?: number) => any

export interface ExtendedSampleStart extends SampleStart {
  [PLAY_STARTED_AT_KEY]?: number
  [TARGET_ID_KEY]?: string
  [USER_PLAY_FLAG_KEY]?: boolean
}

export interface StartOptions {
  id?: string
  isUserStart?: boolean
}

export interface PlayOptions {
  id: string
  notes?: SampleStart[]
  totalDuration: number
}

export interface SplendidGrandPianoExtended
  extends Omit<
    SplendidGrandPiano,
    'start' | 'stop' | 'onEnded' | 'onStart' | 'buffers' | 'output' | 'loaded'
  > {
  readonly __original: Readonly<SplendidGrandPiano>
  readonly down: (key: string | number | SampleStart) => StopFn
  readonly getLeftTime: () => number
  readonly getPlayedTime: () => number
  readonly play: (payload: PlayOptions) => void
  readonly resume: (time?: number) => void
  readonly seek: (time: number) => void
  readonly start: (payload: SampleStart, options: StartOptions) => StopFn
  readonly stop: (payload?: SampleStart) => void
  readonly suspend: () => void
  readonly up: (key: string | number | SampleStart) => void
}

export const createSplendidGrandPianoExtended = (
  audioContext: AudioContext,
  options: SplendidGrandPianoOptions = {},
): SplendidGrandPianoExtended => {
  let _currentPlay: PlayOptions | undefined
  let _suspendedTime = 0
  let _startedAt = 0

  const storage = new CacheStorage()

  const _piano: SplendidGrandPiano = new SplendidGrandPiano(audioContext, {
    ...options,
    storage,
  })

  const start = (payload: SampleStart, options: StartOptions = {}) => {
    const {id = '', isUserStart = false} = options
    const {time = 0, velocity = 1} = payload

    return _piano.start({
      ...payload,
      [PLAY_STARTED_AT_KEY]: _piano.context.currentTime,
      [TARGET_ID_KEY]: id,
      [USER_PLAY_FLAG_KEY]: isUserStart,
      time: time + _piano.context.currentTime,
      velocity: velocity * HUNDRED,
    } as any)
  }

  const play = (payload: PlayOptions) => {
    const {notes} = payload

    if (!notes) {
      return
    }

    _piano.stop()
    _startedAt = _piano.context.currentTime
    _currentPlay = payload

    for (const note of notes) {
      _piano.start(note)
    }
  }

  const resume = (time?: number) => {
    const suspendedTime = time ?? _suspendedTime
    const {notes} = _currentPlay ?? {}

    _startedAt = _piano.context.currentTime - _suspendedTime
    _suspendedTime = 0

    if (!notes) {
      return
    }

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
        _piano.start(note)
      }
    }
  }

  const suspend = () => {
    _suspendedTime = _piano.context.currentTime - _startedAt

    return _piano.stop()
  }

  const stop = (payload?: SampleStart) => {
    _currentPlay = undefined
    _piano.stop(payload)
  }

  const down = (key: string | number | SampleStart): StopFn => {
    if (typeof key === 'string' || typeof key === 'number') {
      return start({note: key}, {isUserStart: true})
    }

    return start(key, {isUserStart: true})
  }

  const up = (key: string | number | SampleStart) => {
    _piano.stop(key)
  }

  const seek = (time: number) => {
    _piano.stop()
    resume(time)
  }

  const getPlayedTime = () => {
    return _piano.context.currentTime - _startedAt
  }

  const getLeftTime = () => {
    const {totalDuration = 0} = _currentPlay ?? {}

    const leftTime = totalDuration - getPlayedTime()

    if (leftTime < 0) {
      return 0
    }

    return leftTime
  }

  return {
    __original: _piano,
    get context() {
      return _piano.context
    },
    down,
    getLeftTime,
    getPlayedTime,
    get load() {
      return _piano.load
    },
    get options() {
      return _piano.options
    },
    play,
    resume,
    seek,
    start,
    stop,
    suspend,
    up,
  }
}
