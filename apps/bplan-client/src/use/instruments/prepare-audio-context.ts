import {getWindow} from '@winter-love/utils'
import {AudioContext as StandardizedAudioContext} from 'standardized-audio-context'

let __audioContext: AudioContext | undefined

export const getAudioContext = async (): Promise<AudioContext | void> => {
  const window = getWindow()

  if (__audioContext) {
    return __audioContext
  }

  if (!window) {
    return
  }

  return window.navigator.mediaDevices
    .getUserMedia({audio: true})
    .then(() => {
      const audioContext: AudioContext = new StandardizedAudioContext() as any

      __audioContext = audioContext

      return audioContext
    })
    .catch(() => {
      if (__audioContext) {
        return
      }

      const audioContext: AudioContext = new StandardizedAudioContext() as any
      let prepared = false

      __audioContext = audioContext

      const prepareAudio = () => {
        window.removeEventListener('mousemove', prepareAudio)

        if (prepared) {
          return
        }

        prepared = true
        audioContext.resume()
      }

      window.addEventListener('mousemove', prepareAudio)
      window.addEventListener('touchstart', prepareAudio)

      return audioContext
    })
}
