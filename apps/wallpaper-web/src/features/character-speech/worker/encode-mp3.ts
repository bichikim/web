import {Mp3Encoder} from '@breezystack/lamejs'
import {SPEECH_BITRATE} from '../configuration'
import type {SpeechAudio} from '../types'

const BLOCK_SAMPLES = 1152
const POSITIVE_PCM = 32767
const NEGATIVE_PCM = 32768

/** Called only inside the synthesis worker; PCM is not retained in the persistent cache. */
export const encodeSpeechMp3 = (audio: SpeechAudio): Blob => {
  const encoder = new Mp3Encoder(1, audio.sampleRate, SPEECH_BITRATE)
  const chunks: Uint8Array<ArrayBuffer>[] = []
  for (let offset = 0; offset < audio.samples.length; offset += BLOCK_SAMPLES) {
    const samples = audio.samples.subarray(offset, offset + BLOCK_SAMPLES)
    const pcm = Int16Array.from(samples, (sample) => {
      const limited = Math.max(-1, Math.min(1, sample))
      return Math.round(limited * (limited < 0 ? NEGATIVE_PCM : POSITIVE_PCM))
    })
    chunks.push(Uint8Array.from(encoder.encodeBuffer(pcm)))
  }
  chunks.push(Uint8Array.from(encoder.flush()))
  return new Blob(chunks, {type: 'audio/mpeg'})
}
