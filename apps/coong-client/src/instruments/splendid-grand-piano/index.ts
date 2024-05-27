import {SplendidGrandPiano, SplendidGrandPianoConfig} from 'smplr'
import {getAudioContext} from '../audio-context'

export type SplendidGrandPianoOptions = Partial<
  Omit<SplendidGrandPianoConfig, 'notesToLoad' | 'baseUrl'>
>

export const createSplendidGrandPiano = (
  options: SplendidGrandPianoOptions = {},
): SplendidGrandPiano => {
  const audioContext = getAudioContext()
  return new SplendidGrandPiano(audioContext, {
    ...options,
    // baseUrl: '/instruments/splendid-grand-piano',
  })
}

export {type SplendidGrandPiano} from 'smplr'
