import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {useModelAssetManager, useModelDownload} from '../model-download'
import type {TarotLocale} from './cards'
import {createTarotSpeechAudioController} from './speech-audio'
import {createTarotSpeechDownloads} from './speech-download'

type TarotSpeechStatus =
  | 'consent'
  | 'downloading'
  | 'error'
  | 'idle'
  | 'playing'
  | 'preparing'
  | 'ready'

export interface UseTarotSpeechProps {
  readonly locale: Accessor<TarotLocale>
  readonly text: Accessor<string>
}

export interface TarotSpeechController {
  readonly audioUrl: Accessor<string | null>
  readonly autoRead: Accessor<boolean>
  readonly autoplay: Accessor<boolean>
  readonly cancelDownload: () => void
  readonly cancelDownloadConsent: () => void
  readonly downloadSize: Accessor<string>
  readonly error: Accessor<string | null>
  readonly onPlaybackEnd: () => void
  readonly onPlaybackError: () => void
  readonly onPlaybackRequest: () => boolean
  readonly onPlaybackStart: () => void
  readonly paused: Accessor<boolean>
  readonly progress: Accessor<number | null>
  readonly request: () => void
  readonly setAutoRead: (value: boolean) => void
  readonly startDownload: () => Promise<void>
  readonly status: Accessor<TarotSpeechStatus>
}

/** Prepares the completed reading with the dialogue voice defaults when voice is requested. */
export const useTarotSpeech = (props: UseTarotSpeechProps): TarotSpeechController => {
  const assets = useModelAssetManager()
  const modelDownload = useModelDownload()
  const [autoRead, setAutoRead] = createSignal(false)
  const [manualPlay, setManualPlay] = createSignal(false)
  const [paused, setPaused] = createSignal(false)
  const audio = createTarotSpeechAudioController({assets, setManualPlay, setPaused})
  const downloads = createTarotSpeechDownloads(modelDownload)
  let latestPreparation = {locale: props.locale(), play: false, text: ''}
  let latestRevision = audio.currentRevision()

  const status = () => downloads.status() ?? audio.status()
  const prepare = async (preparation: typeof latestPreparation, requested: boolean) => {
    latestPreparation = preparation
    downloads.reset()
    const result = await audio.prepare(preparation)
    if (audio.isCurrent(result.revision)) {
      latestRevision = result.revision
    }
    if (!requested || !result.missing || !audio.isCurrent(result.revision)) {
      return
    }
    if (downloads.hasPending()) {
      await downloads.start(
        () => audio.isCurrent(result.revision),
        () => audio.prepare(preparation),
      )
    } else {
      downloads.requestConsent()
    }
  }
  const request = () => {
    if (!['preparing', 'downloading', 'consent'].includes(status())) {
      return prepare({locale: props.locale(), play: true, text: props.text().trim()}, true)
    }
    return Promise.resolve()
  }
  const startDownload = async () => {
    if (downloads.status() !== 'consent') {
      return
    }
    const preparation = latestPreparation
    const revision = latestRevision
    await downloads.start(
      () => audio.isCurrent(revision),
      () => audio.prepare(preparation),
    )
  }
  const cancelDownload = () => {
    if (downloads.status() !== 'downloading') {
      return
    }
    audio.release()
    downloads.cancel()
    setManualPlay(false)
  }
  const cancelDownloadConsent = () => {
    if (downloads.status() === 'consent') {
      downloads.cancelConsent()
      setManualPlay(false)
    }
  }

  createEffect(() => {
    const text = props.text().trim()
    const locale = props.locale()
    const requested = autoRead()
    untrack(() => prepare({locale, play: requested, text}, requested))
  })
  onCleanup(audio.dispose)

  return {
    audioUrl: audio.audioUrl,
    autoplay: () => !paused() && (autoRead() || manualPlay()),
    autoRead,
    cancelDownload,
    cancelDownloadConsent,
    downloadSize: downloads.size,
    error: () => downloads.error() ?? audio.error(),
    onPlaybackEnd: audio.onPlaybackEnd,
    onPlaybackError: audio.onPlaybackError,
    onPlaybackRequest: audio.onPlaybackRequest,
    onPlaybackStart: audio.onPlaybackStart,
    paused,
    progress: downloads.progress,
    request,
    setAutoRead,
    startDownload,
    status,
  }
}
