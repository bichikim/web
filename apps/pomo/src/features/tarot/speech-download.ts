import {type Accessor, createSignal} from 'solid-js'
import * as m from '@paraglide/message'
import {type ModelDownloadController, type ModelDownloadResult} from '../model-download'
import {formatModelDownloadSize} from '../model-storage/size'
import {DEFAULT_DIALOGUE_MODEL_ID} from '../focus-room-dialogue/speech-defaults'
import {getSupertonicModel} from '../supertonic/model'

export interface TarotSpeechDownloads {
  readonly cancel: () => void
  readonly cancelConsent: () => void
  readonly error: Accessor<string | null>
  readonly hasPending: () => boolean
  readonly progress: Accessor<number | null>
  readonly requestConsent: () => void
  readonly reset: () => void
  readonly size: Accessor<string>
  readonly start: (isCurrent: () => boolean, onComplete: () => Promise<unknown>) => Promise<void>
  readonly status: Accessor<'consent' | 'downloading' | 'error' | null>
}

export const createTarotSpeechDownloads = (
  modelDownload: ModelDownloadController,
): TarotSpeechDownloads => {
  const [status, setStatus] = createSignal<'consent' | 'downloading' | 'error' | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  let startRevision = 0
  const activeDownload = () =>
    modelDownload
      .downloads()
      .find(
        (download) =>
          download.target.kind === 'voice' &&
          download.target.modelId === DEFAULT_DIALOGUE_MODEL_ID &&
          download.status === 'loading',
      )
  const hasPending = () =>
    modelDownload
      .downloads()
      .some(
        (download) =>
          download.target.kind === 'voice' &&
          download.target.modelId === DEFAULT_DIALOGUE_MODEL_ID &&
          download.status !== 'error',
      )
  const reset = () => {
    startRevision += 1
    setError(null)
    setStatus(null)
  }
  const start = async (isCurrent: () => boolean, onComplete: () => Promise<unknown>) => {
    startRevision += 1
    const currentStartRevision = startRevision
    setStatus('downloading')
    try {
      const result = await modelDownload.startVoiceModel(DEFAULT_DIALOGUE_MODEL_ID)
      if (currentStartRevision !== startRevision) {
        return
      }
      await handleResult(result, isCurrent, onComplete)
    } catch (cause: unknown) {
      if (currentStartRevision === startRevision) {
        setError(cause instanceof Error ? cause.message : m.tarot_voice_failed())
        setStatus('error')
      }
    }
  }
  const handleResult = async (
    result: ModelDownloadResult,
    isCurrent: () => boolean,
    onComplete: () => Promise<unknown>,
  ) => {
    switch (result.status) {
      case 'complete':
        reset()
        if (isCurrent()) {
          await onComplete()
        }
        return
      case 'cancelled':
        reset()
        return
      case 'error':
        setError(result.message)
        setStatus('error')
        return
    }
    result satisfies never
  }

  return {
    cancel: () => {
      modelDownload.cancel({kind: 'voice', modelId: DEFAULT_DIALOGUE_MODEL_ID})
      reset()
    },
    cancelConsent: reset,
    error,
    hasPending,
    progress: () => {
      const download = activeDownload()
      return status() === 'downloading' && download?.status === 'loading'
        ? download.percentage
        : null
    },
    requestConsent: () => {
      setError(null)
      setStatus('consent')
    },
    reset,
    size: () => formatModelDownloadSize(getSupertonicModel(DEFAULT_DIALOGUE_MODEL_ID).size),
    start,
    status,
  }
}
