import {type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import type {PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import {DEFAULT_POFFO_VOICE, poffoVoiceSchema} from '@winter-love/wallpaper/settings/voice'
import {createVoiceClient} from './client'
import {createReadout, type VoiceStatus} from './readout'
import type {VoiceMessage} from './text'

interface UseVoiceProps {
  readonly speech: Accessor<PoffoSpeech>
  readonly message: Accessor<VoiceMessage | null>
  readonly onLevel?: (level: number) => void
}

/** Owns the selected bubble's narration with this widget's preferences. */
export const useVoice = (props: UseVoiceProps) => {
  const voice = createMemo(() => {
    const speech = props.speech()
    const value = poffoVoiceSchema.parse(speech.voice ?? DEFAULT_POFFO_VOICE)
    return {...value, enabled: speech.enabled && value.enabled}
  })
  const [status, setStatus] = createSignal<VoiceStatus>('idle')
  const [error, setError] = createSignal<string | null>(null)
  const reader = createReadout({
    onError: (cause) => {
      console.error('Poffo narration failed', cause)
      setError(cause instanceof Error ? cause.message : '음성 생성에 실패했어요.')
    },
    onStatus: (status) => {
      setStatus(status)
      if (status !== 'idle') {
        setError(null)
      }
    },
    port: createVoiceClient({onLevel: (level) => props.onLevel?.(level), retainLocalModel: true}),
  })
  createEffect(() => {
    const message = props.message()
    const settings = voice()
    untrack(() => reader.update(message, settings))
  })
  onCleanup(reader.dispose)
  return {error, retry: reader.retry, status}
}
