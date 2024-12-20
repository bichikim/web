import {
  CacheStorage,
  DrumMachine,
  SplendidGrandPiano,
  type SplendidGrandPianoConfig,
} from 'smplr'
import {Accessor, createEffect, createSignal} from 'solid-js'
import {AudioContext as StandardizedAudioContext} from 'standardized-audio-context'
import {createEmitter} from './emiter'

export type SampleStart = Parameters<DrumMachine['start']>[0]

export type SplendidGrandPianoOptions = Partial<
  Omit<SplendidGrandPianoConfig, 'notesToLoad' | 'baseUrl'>
>

export type PianoEvent = 'start' | 'end'

export const createSplendidGrandPiano = (
  options: SplendidGrandPianoOptions = {},
): Accessor<SplendidGrandPiano | undefined> => {
  const [splendidGrandPiano, setSplendidGrandPiano] = createSignal<
    SplendidGrandPiano | undefined
  >()
  let _audioContext: AudioContext | undefined

  createEffect(() => {
    if (_audioContext) {
      return
    }
    const storage = new CacheStorage()
    const audioContext: AudioContext = new StandardizedAudioContext() as any
    const splendidGrandPiano = new SplendidGrandPiano(audioContext, {
      ...options,
      // baseUrl: '/instruments/splendid-grand-piano',
      storage,
    })
    _audioContext = audioContext

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

    splendidGrandPiano.load.then(() => {
      setSplendidGrandPiano(Object.assign(splendidGrandPiano, emitter))
    })
  })

  return splendidGrandPiano
}

export {type SplendidGrandPiano} from 'smplr'
