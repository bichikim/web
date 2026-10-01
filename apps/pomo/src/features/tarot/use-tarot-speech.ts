import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import * as m from '@paraglide/message'
import {replaceBlobObjectUrl} from '../blob-object-url'
import {useModelAssetManager} from '../model-download'
import {
  DEFAULT_DIALOGUE_MODEL_ID,
  DEFAULT_DIALOGUE_VOICE_ID,
} from '../focus-room-dialogue/speech-defaults'
import {
  createDialogueAudioPreview,
  generateDialogueAudio,
} from '../focus-room-dialogue/dialogue-audio-runtime'
import {createSupertonicClient, type SupertonicClient} from '../supertonic/client'
import {getSupertonicErrorMessage} from '../supertonic/error-message'
import type {TarotLocale} from './cards'

type TarotSpeechStatus = 'idle' | 'preparing' | 'ready' | 'playing' | 'error'

export interface UseTarotSpeechProps {
  readonly locale: Accessor<TarotLocale>
  readonly text: Accessor<string>
}

export interface TarotSpeechController {
  readonly audioUrl: Accessor<string | null>
  readonly autoRead: Accessor<boolean>
  readonly autoplay: Accessor<boolean>
  readonly error: Accessor<string | null>
  readonly onPlaybackEnd: () => void
  readonly onPlaybackError: () => void
  readonly onPlaybackRequest: () => boolean
  readonly onPlaybackStart: () => void
  readonly paused: Accessor<boolean>
  readonly request: () => void
  readonly setAutoRead: (value: boolean) => void
  readonly status: Accessor<TarotSpeechStatus>
}

/** Prepares the completed reading using the dialogue voice defaults and owns its disposable audio. */
export const useTarotSpeech = (props: UseTarotSpeechProps): TarotSpeechController => {
  const assets = useModelAssetManager()
  const [audioUrl, setAudioUrl] = createSignal<string | null>(null)
  const [autoRead, setAutoRead] = createSignal(false)
  const [manualPlay, setManualPlay] = createSignal(false)
  const [paused, setPaused] = createSignal(false)
  const [status, setStatus] = createSignal<TarotSpeechStatus>('idle')
  const [error, setError] = createSignal<string | null>(null)
  let client: SupertonicClient | null = null
  let revision = 0
  let disposed = false

  const release = () => {
    revision += 1
    client?.dispose()
    client = null
    setPaused(true)
    setAudioUrl((current) => replaceBlobObjectUrl(current, () => null))
    setError(null)
    setStatus('idle')
  }
  const prepare = async (text: string, locale: TarotLocale, play: boolean) => {
    release()
    if (text.length === 0 || disposed) {
      return
    }
    const currentRevision = revision
    setManualPlay(play)
    setStatus('preparing')
    const isCurrent = () => !disposed && currentRevision === revision
    try {
      const result = await assets.runAfterVoiceModel({
        downloadIfMissing: false,
        modelId: DEFAULT_DIALOGUE_MODEL_ID,
        task: async () => {
          if (!isCurrent()) {
            return null
          }
          const activeClient = createSupertonicClient()
          client = activeClient
          try {
            const initialized = await activeClient.initialize({
              modelId: DEFAULT_DIALOGUE_MODEL_ID,
              onProgress: () => undefined,
              onStatus: () => undefined,
            })
            if (!isCurrent()) {
              return null
            }
            if (!initialized.ok) {
              throw new Error(getSupertonicErrorMessage(initialized.error))
            }
            const generated = await generateDialogueAudio({
              client: activeClient,
              language: locale,
              modelId: DEFAULT_DIALOGUE_MODEL_ID,
              onChunk: () => undefined,
              text,
              voiceId: DEFAULT_DIALOGUE_VOICE_ID,
            })
            if (!isCurrent()) {
              return null
            }
            if (!generated.ok) {
              throw new Error(generated.message)
            }
            return createDialogueAudioPreview(generated.value, DEFAULT_DIALOGUE_MODEL_ID)
          } finally {
            if (client === activeClient) {
              activeClient.dispose()
              client = null
            }
          }
        },
      })
      if (!isCurrent()) {
        return
      }
      switch (result.status) {
        case 'complete':
          if (result.value !== null) {
            setPaused(false)
            setStatus('ready')
            setAudioUrl((current) => replaceBlobObjectUrl(current, () => result.value))
          }
          return
        case 'error':
          setError(result.message)
          setStatus('error')
          return
        case 'missing':
          setError(m.tarot_voice_missing())
          setStatus('error')
          return
        case 'cancelled':
          setStatus('idle')
          return
      }
      result satisfies never
    } catch (cause: unknown) {
      if (isCurrent()) {
        setError(cause instanceof Error ? cause.message : m.tarot_voice_failed())
        setStatus('error')
      }
    }
  }
  const request = () => {
    if (status() !== 'preparing') {
      prepare(props.text().trim(), props.locale(), true)
    }
  }
  const onPlaybackStart = () => setStatus('playing')
  const onPlaybackEnd = () => {
    setPaused(true)
    if (audioUrl() !== null) {
      setStatus('ready')
    }
  }
  const onPlaybackError = () => {
    onPlaybackEnd()
    setError(m.tarot_voice_play_failed())
  }
  const onPlaybackRequest = () => {
    setError(null)
    setPaused(false)
    return true
  }

  createEffect(() => {
    const text = props.text().trim()
    const locale = props.locale()
    untrack(() => prepare(text, locale, false))
  })
  onCleanup(() => {
    disposed = true
    release()
  })

  return {
    audioUrl,
    autoplay: () => !paused() && (autoRead() || manualPlay()),
    autoRead,
    error,
    onPlaybackEnd,
    onPlaybackError,
    onPlaybackRequest,
    onPlaybackStart,
    paused,
    request,
    setAutoRead,
    status,
  }
}
