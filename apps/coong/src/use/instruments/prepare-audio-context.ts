import {getWindow} from '@winter-love/utils'
import {AudioContext as StandardizedAudioContext} from 'standardized-audio-context'

let __audioContext: AudioContext | undefined
let __isActivationListenerRegistered = false

const audioContextListeners = new Set<(audioContext: AudioContext) => void>()

const activationEvents = ['pointerdown', 'keydown', 'touchstart'] as const
const activationListenerOptions = {capture: true, passive: true} as const

export const getAudioContext = (): AudioContext | undefined => {
  return __audioContext
}

const removeActivationListeners = (window: Window, activateAudioContext: () => void) => {
  for (const eventName of activationEvents) {
    window.removeEventListener(eventName, activateAudioContext, activationListenerOptions)
  }

  __isActivationListenerRegistered = false
}

const playSilentBuffer = (audioContext: AudioContext) => {
  const source = audioContext.createBufferSource()

  source.buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate)
  source.connect(audioContext.destination)
  source.start(0)
}

const createAudioContext = (): AudioContext => {
  if (!__audioContext) {
    const audioContext = new StandardizedAudioContext() as any

    __audioContext = audioContext

    return audioContext
  }

  return __audioContext
}

const notifyAudioContextListeners = (audioContext: AudioContext) => {
  for (const listener of audioContextListeners) {
    listener(audioContext)
  }
}

const registerActivationListeners = (window: Window) => {
  if (__isActivationListenerRegistered) {
    return
  }

  __isActivationListenerRegistered = true

  const activateAudioContext = () => {
    const audioContext = createAudioContext()

    audioContext.resume().catch(() => {
      //
    })
    playSilentBuffer(audioContext)
    removeActivationListeners(window, activateAudioContext)
    notifyAudioContextListeners(audioContext)
  }

  for (const eventName of activationEvents) {
    window.addEventListener(eventName, activateAudioContext, activationListenerOptions)
  }
}

export const prepareAudioContext = (
  listener: (audioContext: AudioContext) => void,
): (() => void) => {
  const audioContext = getAudioContext()

  if (audioContext) {
    listener(audioContext)

    return () => {
      //
    }
  }

  const window = getWindow()

  if (!window) {
    return () => {
      //
    }
  }

  audioContextListeners.add(listener)
  registerActivationListeners(window)

  return () => {
    audioContextListeners.delete(listener)
  }
}
