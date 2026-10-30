import type {LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'
import type {VoiceReadoutPort} from './readout'
import {createAudioPlayer} from './audio-player'
import {createResidentSynthesis} from './resident-synthesis'
import {createSynthesis} from './synthesis'
import {createLiveSynthesis} from './live-synthesis'
import type {PoffoVoice} from '@winter-love/wallpaper/settings/voice'

interface VoiceClientOptions {
  readonly retainLocalModel?: boolean
  readonly alignSpeech?: () => boolean
  readonly onShape?: (shape: LipSyncShape | null, level: number) => void
  readonly onLevel?: (level: number) => void
}

/** Owns playback and remote speech, with optional local-model retention for bubble narration. */
export const createVoiceClient = (options: VoiceClientOptions = {}): VoiceReadoutPort => {
  const synthesis = options.retainLocalModel ? createResidentSynthesis() : createSynthesis()
  const chatgpt = createLiveSynthesis()
  const player = createAudioPlayer(options.onLevel, options.onShape)
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
    prepare: async (text, voice, signal, observer) => {
      if (options.alignSpeech?.()) {
        // Keep the whole utterance so text poses follow its actual duration, not network chunks.
        const audio = await provider(voice).generate(text, voice, signal, {status: observer.status})
        return {...audio, text}
      }
      return provider(voice).generate(text, voice, signal, observer)
    },
  }
}
