import cueUrl from './assets/read-cue.wav?url'
import {SpeechConnectionError} from './connection-error'

/** Decodes a bundled synthetic reading request for the remote input track. */
export const loadReadCue = async (
  context: AudioContext,
  signal: AbortSignal,
): Promise<AudioBuffer> => {
  signal.throwIfAborted()
  const response = await fetch(cueUrl, {signal})
  if (!response.ok) {
    throw new SpeechConnectionError('unavailable')
  }
  const audio = await context.decodeAudioData(await response.arrayBuffer())
  signal.throwIfAborted()
  return audio
}
