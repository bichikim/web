import type {LipSyncOutput} from '../lipsync/types'
import {type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import type {PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import {DEFAULT_POFFO_VOICE, poffoVoiceSchema} from '@winter-love/wallpaper/settings/voice'
import {createVoiceClient} from './client'
import {createReadout, type VoiceStatus} from './readout'
import type {VoiceMessage} from './text'
import type {VoicePlayback} from './types'

interface UseVoiceProps {
  readonly speech: Accessor<PoffoSpeech>
  readonly message: Accessor<VoiceMessage | null>
  readonly onShape?: LipSyncOutput
  readonly onLevel?: (level: number) => void
}

/** Owns the selected bubble's narration with this widget's preferences. */
export const useVoice = (props: UseVoiceProps) => {
  const voice = createMemo(() => {
    const speech = props.speech()
    const value = poffoVoiceSchema.parse(speech.voice ?? DEFAULT_POFFO_VOICE)
    return {...value, enabled: speech.enabled && value.enabled}
  })
  const [readoutId, setReadoutId] = createSignal<string | undefined>(undefined)
  const [status, setStatus] = createSignal<VoiceStatus>('idle')
  const [playback, setPlayback] = createSignal<VoicePlayback | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const onError = (cause: unknown) => {
    console.error('Poffo narration failed', cause)
    setError(cause instanceof Error ? cause.message : '음성 생성에 실패했어요.')
  }
  const reader = createReadout({
    onError,
    onPlayback: setPlayback,
    onStatus: (status) => {
      setStatus(status)
      if (status === 'playing') {
        setReadoutId(props.message()?.id)
      }
      if (status === 'idle') {
        setReadoutId(undefined)
      }
      if (status !== 'idle') {
        setError(null)
      }
    },
    port: createVoiceClient({
      analyzeSpeech: () => props.speech().lipsync?.source === 'voice',
      onLevel: (level) => props.onLevel?.(level),
      onShape: (shape, level, weights, pose) => props.onShape?.(shape, level, weights, pose),
      retainLocalModel: true,
    }),
  })
  createEffect(() => {
    const message = props.message()
    const settings = voice()
    untrack(() => reader.update(message, settings))
  })
  onCleanup(reader.dispose)
  return {
    available: () => voice().enabled && (props.message()?.text.trim().length ?? 0) > 0,
    error,
    playback: () => {
      const active = playback()
      const message = props.message()
      if (active === null || message === null || active.message.chat !== message.chat) {
        return null
      }
      return active.message.id === message.id && message.text.startsWith(active.message.text)
        ? {...active, message}
        : active
    },
    readoutId: () => (readoutId() === props.message()?.id ? readoutId() : undefined),
    status,
    toggle: () => reader.toggle().catch(onError),
  }
}
