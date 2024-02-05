import {once} from '@winter-love/utils'
import {AudioContext as StandardizedAudioContext} from 'standardized-audio-context'

export const getAudioContext = once((): AudioContext => {
  return new StandardizedAudioContext() as any
})
