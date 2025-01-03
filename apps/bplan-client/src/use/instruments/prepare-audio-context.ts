import {getWindow} from '@winter-love/utils'
import {AudioContext as StandardizedAudioContext} from 'standardized-audio-context'

let __audioContext: AudioContext | undefined

export const getAudioContext = (): AudioContext | undefined => {
  const window = getWindow()

  if (__audioContext) {
    return __audioContext
  }

  if (!window) {
    return
  }

  __audioContext = new StandardizedAudioContext() as any

  return __audioContext
}
