import {SplendidGrandPiano, SplendidGrandPianoConfig} from 'smplr'
import {getAudioContext} from '../audio-context'
import {once} from '@winter-love/utils'
import {onMounted, shallowRef, provide} from 'vue'

export type SplendidGrandPianoOptions = Partial<
  Omit<SplendidGrandPianoConfig, 'notesToLoad' | 'baseUrl'>
>

export type {SplendidGrandPiano}
export const createSplendidGrandPiano = (
  options: SplendidGrandPianoOptions = {},
): SplendidGrandPiano => {
  const audioContext = getAudioContext()
  return new SplendidGrandPiano(audioContext, {
    ...options,
    // baseUrl: '/instruments/splendid-grand-piano',
  })
}
