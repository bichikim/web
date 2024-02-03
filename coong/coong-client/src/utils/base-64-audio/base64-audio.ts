import {AudioBuffer} from 'standardized-audio-context'
import {arrayBuffer} from './array-buffer'
import {removeBase64Prefix} from './remove-base64-prefix'
export const base64Audio = (
  audioContext: AudioContext,
  base64Url: string,
): Promise<AudioBuffer> => {
  return audioContext.decodeAudioData(arrayBuffer(removeBase64Prefix(base64Url)))
}
