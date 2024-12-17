import {CacheStorage, SplendidGrandPiano, type SplendidGrandPianoConfig} from 'smplr'
import {AudioContext as StandardizedAudioContext} from 'standardized-audio-context'
import {once} from '@winter-love/utils'
import {Accessor, createEffect, createSignal} from 'solid-js'

export type SplendidGrandPianoOptions = Partial<
  Omit<SplendidGrandPianoConfig, 'notesToLoad' | 'baseUrl'>
>

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

    splendidGrandPiano.load.then(() => {
      setSplendidGrandPiano(splendidGrandPiano)
    })
  })

  return splendidGrandPiano
}

export {type SplendidGrandPiano} from 'smplr'
