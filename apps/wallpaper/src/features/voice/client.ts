import type {LipSyncCue, LipSyncOutput} from '../lipsync/types'
import type {VoiceReadoutPort} from './readout'
import {createAudioPlayer} from './audio-player'
import {createResidentSynthesis} from './resident-synthesis'
import {createSynthesis, type VoiceAudio} from './synthesis'
import {createLiveSynthesis} from './live-synthesis'
import type {PoffoVoice} from '@winter-love/wallpaper/settings/voice'
import {alignSpeechShapes} from './align-speech-shapes'

interface VoiceClientOptions {
  readonly retainLocalModel?: boolean
  readonly analyzeSpeech?: () => boolean
  readonly onShape?: LipSyncOutput
  readonly onLevel?: (level: number) => void
}

const scheduleSpeechShapes = (audio: VoiceAudio, text: string, signal: AbortSignal) => {
  let shapeCues: readonly LipSyncCue[] | undefined
  return {
    clip: {
      ...audio,
      get shapeCues() {
        return shapeCues
      },
    },
    onScheduled() {
      alignSpeechShapes({audio, signal, text})
        .then((cues) => {
          if (!signal.aborted) {
            shapeCues = cues
          }
        })
        .catch((cause: unknown) => {
          if (!signal.aborted) {
            console.warn('Poffo speech alignment failed', cause)
          }
        })
    },
  }
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
    play: (audio, voice, signal, onStart) => {
      const local = voice.provider === 'local'
      const aligned =
        local && options.analyzeSpeech?.() && audio.text !== undefined
          ? scheduleSpeechShapes(audio, audio.text, signal)
          : undefined
      return player.enqueue(aligned?.clip ?? audio, voice.volume, signal, {
        ...(aligned === undefined ? {} : {onScheduled: aligned.onScheduled}),
        onStart,
        speed: local ? 1 : voice.speed,
      })
    },
    prepare: (text, voice, signal, observer) =>
      provider(voice).generate(text, voice, signal, observer),
    setPaused: player.setPaused,
    stop: player.stop,
  }
}
