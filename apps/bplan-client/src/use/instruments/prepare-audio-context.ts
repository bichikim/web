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

  const activateAudioContext = () => {
    if (__audioContext) {
      __audioContext.resume()
      const source = __audioContext.createBufferSource()

      source.connect(__audioContext.destination)
      source.start()
    }

    window.removeEventListener('touchstart', activateAudioContext)
    window.removeEventListener('mousedown', activateAudioContext)
    window.removeEventListener('mousemove', activateAudioContext)
  }

  // any action can active audio context
  window.addEventListener('touchstart', activateAudioContext)
  window.addEventListener('mousedown', activateAudioContext)
  window.addEventListener('mousemove', activateAudioContext)

  return __audioContext
}
