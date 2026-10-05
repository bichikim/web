import {type Accessor, createSignal, type Setter} from 'solid-js'
import * as m from '@paraglide/message'
import {replaceBlobObjectUrl} from '../blob-object-url'
import type {ModelAssetManager} from '../model-download'
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

export type TarotSpeechAudioStatus = 'error' | 'idle' | 'playing' | 'preparing' | 'ready'

export interface TarotSpeechPreparation {
  readonly locale: TarotLocale
  readonly play: boolean
  readonly text: string
}

export interface TarotSpeechAudioController {
  readonly audioUrl: Accessor<string | null>
  readonly currentRevision: () => number
  readonly dispose: () => void
  readonly error: Accessor<string | null>
  readonly isCurrent: (revision: number) => boolean
  readonly onPlaybackEnd: () => void
  readonly onPlaybackError: () => void
  readonly onPlaybackRequest: () => boolean
  readonly onPlaybackStart: () => void
  readonly prepare: (
    preparation: TarotSpeechPreparation,
  ) => Promise<{readonly missing: boolean; readonly revision: number}>
  readonly release: () => void
  readonly status: Accessor<TarotSpeechAudioStatus>
}

export interface CreateTarotSpeechAudioOptions {
  readonly assets: ModelAssetManager
  readonly setManualPlay: Setter<boolean>
  readonly setPaused: Setter<boolean>
}

export const createTarotSpeechAudioController = (
  options: CreateTarotSpeechAudioOptions,
): TarotSpeechAudioController => {
  const [audioUrl, setAudioUrl] = createSignal<string | null>(null)
  const [status, setStatus] = createSignal<TarotSpeechAudioStatus>('idle')
  const [error, setError] = createSignal<string | null>(null)
  let client: SupertonicClient | null = null
  let revision = 0
  let disposed = false

  const release = () => {
    revision += 1
    client?.dispose()
    client = null
    options.setPaused(true)
    setAudioUrl((current) => replaceBlobObjectUrl(current, () => null))
    setError(null)
    setStatus('idle')
  }
  const isCurrent = (currentRevision: number) => !disposed && currentRevision === revision
  const prepare = async (preparation: TarotSpeechPreparation) => {
    release()
    if (preparation.text.length === 0 || disposed) {
      return {missing: false, revision}
    }

    const currentRevision = revision
    options.setManualPlay(preparation.play)
    setStatus('preparing')
    try {
      const result = await options.assets.runAfterVoiceModel({
        downloadIfMissing: false,
        modelId: DEFAULT_DIALOGUE_MODEL_ID,
        task: async () => {
          if (!isCurrent(currentRevision)) {
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
            if (!isCurrent(currentRevision)) {
              return null
            }
            if (!initialized.ok) {
              throw new Error(getSupertonicErrorMessage(initialized.error))
            }
            const generated = await generateDialogueAudio({
              client: activeClient,
              language: preparation.locale,
              modelId: DEFAULT_DIALOGUE_MODEL_ID,
              onChunk: () => undefined,
              text: preparation.text,
              voiceId: DEFAULT_DIALOGUE_VOICE_ID,
            })
            if (!isCurrent(currentRevision)) {
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
      if (!isCurrent(currentRevision)) {
        return {missing: false, revision: currentRevision}
      }
      switch (result.status) {
        case 'complete':
          if (result.value === null) {
            setStatus('idle')
          } else {
            options.setPaused(false)
            setStatus('ready')
            setAudioUrl((current) => replaceBlobObjectUrl(current, () => result.value))
          }
          return {missing: false, revision: currentRevision}
        case 'error':
          setError(result.message)
          setStatus('error')
          return {missing: false, revision: currentRevision}
        case 'missing':
          setStatus('idle')
          return {missing: true, revision: currentRevision}
        case 'cancelled':
          setStatus('idle')
          return {missing: false, revision: currentRevision}
      }
      result satisfies never
    } catch (cause: unknown) {
      if (isCurrent(currentRevision)) {
        setError(cause instanceof Error ? cause.message : m.tarot_voice_failed())
        setStatus('error')
      }
      return {missing: false, revision: currentRevision}
    }
  }
  const onPlaybackStart = () => setStatus('playing')
  const onPlaybackEnd = () => {
    options.setPaused(true)
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
    options.setPaused(false)
    return true
  }
  const dispose = () => {
    disposed = true
    release()
  }

  return {
    audioUrl,
    currentRevision: () => revision,
    dispose,
    error,
    isCurrent,
    onPlaybackEnd,
    onPlaybackError,
    onPlaybackRequest,
    onPlaybackStart,
    prepare,
    release,
    status,
  }
}
