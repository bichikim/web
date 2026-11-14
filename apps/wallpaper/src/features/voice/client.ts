import type {LipSyncOutput} from '../lipsync/types'
import type {VoiceReadoutPort} from './readout'
import {createAudioPlayer} from './audio-player'
import {createResidentSynthesis} from './resident-synthesis'
import {createSynthesis} from './synthesis'
import {createLiveSynthesis} from './live-synthesis'
import type {PoffoVoice} from '@winter-love/wallpaper/settings/voice'

interface VoiceClientOptions {
  readonly retainLocalModel?: boolean
  readonly analyzeSpeech?: () => boolean
  readonly onShape?: LipSyncOutput
  readonly onLevel?: (level: number) => void
}

/** Owns playback and remote speech, with optional local-model retention for bubble narration. */
export const createVoiceClient = (options: VoiceClientOptions = {}): VoiceReadoutPort => {
  const synthesis = options.retainLocalModel ? createResidentSynthesis() : createSynthesis()
  const chatgpt = createLiveSynthesis()
  const player = createAudioPlayer(options.onLevel, options.onShape, options.analyzeSpeech)
  const provider = (voice: PoffoVoice) => {
    switch (voice.provider) {
      case 'local':
        return synthesis
      case 'chatgpt':
        return chatgpt
      default: {
        const never: never = voice.provider
        return never
      }
    }
  }
  return {
    dispose: () => {
      synthesis.dispose()
      chatgpt.dispose()
      player.dispose()
    },
    play: (audio, voice, signal) =>
      player.enqueue(audio, voice.volume, signal, voice.provider === 'local' ? 1 : voice.speed),
    prepare: (text, voice, signal, observer) =>
      provider(voice).generate(text, voice, signal, observer),
  }
}
