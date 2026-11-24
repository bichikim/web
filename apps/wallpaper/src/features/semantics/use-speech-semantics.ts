import {type Accessor, createMemo} from 'solid-js'
import type {SemanticNarration} from '@winter-love/wallpaper/settings/semantics'
import type {VoiceMessage} from '../voice/text'
import type {VoicePlayback} from '../voice/types'
import type {VoiceStatus} from '../voice/readout'
import {segmentText} from './segment-text'
import {useSemanticInput} from './use-semantic-input'

interface UseSpeechSemanticsProps {
  /** Owner widget; omitted identity stops delivery. */
  readonly widgetId: Accessor<string | undefined>
  /** Whether this widget's speech bubbles are enabled. */
  readonly enabled: Accessor<boolean>
  /** Selected bubble's speakable text, independent of generation and playback. */
  readonly message: Accessor<VoiceMessage | null>
  /** Current audio position; null means audio has not started or has ended. */
  readonly playback: Accessor<VoicePlayback | null>
  /** Whether narration is enabled; otherwise only the latest completed text segment is classified. */
  readonly voiceEnabled: Accessor<boolean>
  /** Preparation, pause, and playback lifecycle of the selected narration. */
  readonly status: Accessor<VoiceStatus>
}

/** Sends only the audible meaning segment and one completed successor, without controlling audio. */
export const useSpeechSemantics = (props: UseSpeechSemanticsProps) => {
  const selection = createMemo(() => props.playback()?.message ?? props.message())
  const segments = createMemo(() => {
    const message = selection()
    return message === null ? [] : segmentText(message)
  })
  const index = createMemo(() => {
    const items = segments()
    const offset = props.playback()?.offset ?? 0
    return props.voiceEnabled()
      ? items.findIndex((segment) => segment.end > offset)
      : items.findLastIndex((segment) => segment.complete)
  })
  const text = () => {
    if (!props.enabled() || (props.voiceEnabled() && props.status() === 'idle')) {
      return ''
    }
    const segment = segments()[index()]
    return segment?.complete ? segment.text : ''
  }
  const nextText = () => {
    if (text() === '' || !props.voiceEnabled()) {
      return undefined
    }
    const next = segments()[index() + 1]
    return next?.complete ? next.text : undefined
  }
  const narration = (): SemanticNarration | undefined => {
    if (!props.enabled() || !props.voiceEnabled() || props.message() === null) {
      return undefined
    }
    const status = props.status()
    if (status === 'idle') {
      return {phase: 'ended'}
    }
    if (status === 'paused') {
      return {phase: 'waiting'}
    }
    const active = props.playback()
    return active === null ? {phase: 'preparing'} : {phase: 'playing', readoutId: active.message.id}
  }
  useSemanticInput({narration, nextText, text, widgetId: props.widgetId})
}
