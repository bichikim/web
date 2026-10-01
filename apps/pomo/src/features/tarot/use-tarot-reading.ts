import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {type ModelDownloadResult, useModelDownload} from '../model-download'
import {getTextModel, isTextModelDownloaded, supportsWebGpu} from '../text-generation'
import {DEFAULT_DIALOGUE_MODEL_ID} from '../focus-room-dialogue/speech-defaults'
import {isSupertonicModelDownloaded} from '../supertonic/download'
import {getSupertonicModel} from '../supertonic/model'
import {formatModelDownloadSize} from '../model-storage/size'
import {createTarotClient, type TarotClient} from './client'
import {
  type DrawnTarotCard,
  drawTarotCards,
  TAROT_DRAW_COUNTS,
  type TarotDrawCount,
  type TarotLocale,
} from './cards'
import type {TarotWorkerResponse} from './messages'

const MODEL_ID = 'gemma-4-e2b'
const MAXIMUM_QUESTION_LENGTH = 500
type TarotReadingStatus =
  | 'checking'
  | 'complete'
  | 'consent'
  | 'downloading'
  | 'error'
  | 'generating'
  | 'idle'
  | 'preparing'
  | 'unsupported'

export interface UseTarotReadingProps {
  readonly locale: Accessor<TarotLocale>
}

export interface TarotReadingController {
  readonly cancel: () => void
  readonly cancelDownload: () => void
  readonly cancelDownloadConsent: () => void
  readonly cards: Accessor<ReadonlyArray<DrawnTarotCard>>
  readonly count: Accessor<TarotDrawCount>
  readonly draw: () => void
  readonly downloadKind: Accessor<'text' | 'voice' | null>
  readonly downloadSize: Accessor<string>
  readonly error: Accessor<string | null>
  readonly output: Accessor<string>
  readonly progress: Accessor<number | null>
  readonly question: Accessor<string>
  readonly retry: () => void
  readonly setCount: (count: TarotDrawCount) => void
  readonly setQuestion: (question: string) => void
  readonly setShowCardsUpright: (show: boolean) => void
  readonly showCardsUpright: Accessor<boolean>
  readonly startDownload: () => Promise<void>
  readonly status: Accessor<TarotReadingStatus>
}

/** Owns the selected cards and one local Gemma interpretation at a time. */
// oxlint-disable-next-line eslint/max-lines-per-function -- One owner coordinates the draw and worker lifecycle.
export const useTarotReading = (props: UseTarotReadingProps): TarotReadingController => {
  const modelDownload = useModelDownload()
  const [count, setDrawCount] = createSignal<TarotDrawCount>(TAROT_DRAW_COUNTS.three)
  const [question, setDraftQuestion] = createSignal('')
  const [showCardsUpright, setShowCardsUpright] = createSignal(true)
  const [cards, setCards] = createSignal<ReadonlyArray<DrawnTarotCard>>([])
  const [output, setOutput] = createSignal('')
  const [status, setStatus] = createSignal<TarotReadingStatus>('idle')
  const [error, setError] = createSignal<string | null>(null)
  const [modelProgress, setModelProgress] = createSignal<number | null>(null)
  const [missingText, setMissingText] = createSignal(false)
  const [missingVoice, setMissingVoice] = createSignal(false)
  let readingQuestion = ''
  let readingLocale: TarotLocale = 'ko'
  let client: TarotClient | null = null
  let activeRequestId: string | null = null
  let revision = 0
  let disposed = false

  const isBusy = () =>
    status() === 'checking' ||
    status() === 'downloading' ||
    status() === 'preparing' ||
    status() === 'generating'
  const activeDownload = () =>
    modelDownload
      .downloads()
      .find(
        (item) =>
          item.status === 'loading' &&
          ((item.target.kind === 'text' && item.target.modelId === MODEL_ID) ||
            (item.target.kind === 'voice' && item.target.modelId === DEFAULT_DIALOGUE_MODEL_ID)),
      )
  const downloadKind = () => {
    const kind = activeDownload()?.target.kind
    return kind === 'text' || kind === 'voice' ? kind : null
  }
  const downloadSize = () =>
    [
      missingText() ? getTextModel(MODEL_ID).downloadSize : null,
      missingVoice()
        ? formatModelDownloadSize(getSupertonicModel(DEFAULT_DIALOGUE_MODEL_ID).size)
        : null,
    ]
      .filter((size) => size !== null)
      .join(' + ')
  const progress = () => {
    const download = activeDownload()
    return status() === 'downloading' && download?.status === 'loading'
      ? download.percentage
      : modelProgress()
  }
  const discardClient = () => {
    client?.dispose()
    client = null
    activeRequestId = null
  }
  const cancel = () => {
    if (!isBusy() && status() !== 'consent') {
      return
    }

    revision += 1
    discardClient()
    setModelProgress(null)
    setError(null)
    setOutput('')
    setStatus('idle')
  }
  const cancelDownload = () => {
    if (status() !== 'downloading') {
      return
    }

    cancel()
    if (missingVoice()) {
      modelDownload.cancel({kind: 'voice', modelId: DEFAULT_DIALOGUE_MODEL_ID})
    }
    if (missingText()) {
      modelDownload.cancel({kind: 'text', modelId: MODEL_ID})
    }
  }
  const handleResponse = (response: TarotWorkerResponse) => {
    if (disposed || response.requestId !== activeRequestId) {
      return
    }

    switch (response.type) {
      case 'progress':
        setModelProgress(response.percentage)
        return
      case 'started':
        setStatus('generating')
        setOutput('')
        return
      case 'token':
        setOutput((value) => value + response.text)
        return
      case 'complete':
        setOutput(response.text)
        setStatus('complete')
        activeRequestId = null
        return
      case 'error':
        setError(response.message)
        setOutput('')
        setStatus('error')
        if (response.restartRequired) {
          discardClient()
        } else {
          activeRequestId = null
        }
        return
    }

    response satisfies never
  }
  const startGeneration = () => {
    const selectedCards = cards()
    if (selectedCards.length === 0 || disposed) {
      return
    }

    setStatus('preparing')
    setModelProgress(null)
    try {
      client ??= createTarotClient({onResponse: handleResponse})
      revision += 1
      const requestId = `tarot-${revision}`
      activeRequestId = requestId
      client.generate({
        cards: selectedCards,
        locale: readingLocale,
        question: readingQuestion,
        requestId,
        type: 'generate',
      })
    } catch (cause: unknown) {
      discardClient()
      setError(cause instanceof Error ? cause.message : '타로 해석을 시작하지 못했어요.')
      setStatus('error')
    }
  }
  const checkModel = async () => {
    if (!supportsWebGpu()) {
      setStatus('unsupported')
      return
    }

    revision += 1
    const checkRevision = revision
    setStatus('checking')
    setError(null)
    try {
      const [textDownloaded, voiceDownloaded] = await Promise.all([
        isTextModelDownloaded({modelId: MODEL_ID}),
        isSupertonicModelDownloaded({modelId: DEFAULT_DIALOGUE_MODEL_ID}),
      ])
      if (disposed || checkRevision !== revision) {
        return
      }

      setMissingText(!textDownloaded)
      setMissingVoice(!voiceDownloaded)
      const downloads = modelDownload.downloads()
      const textPending = downloads.some(
        (item) =>
          item.target.kind === 'text' &&
          item.target.modelId === MODEL_ID &&
          item.status !== 'error',
      )
      const voicePending = downloads.some(
        (item) =>
          item.target.kind === 'voice' &&
          item.target.modelId === DEFAULT_DIALOGUE_MODEL_ID &&
          item.status !== 'error',
      )
      if (textDownloaded && voiceDownloaded) {
        startGeneration()
      } else if ((textDownloaded || textPending) && (voiceDownloaded || voicePending)) {
        await waitForDownload()
      } else {
        setStatus('consent')
      }
    } catch (cause: unknown) {
      if (disposed || checkRevision !== revision) {
        return
      }
      setError(cause instanceof Error ? cause.message : '모델 상태를 확인하지 못했어요.')
      setStatus('error')
    }
  }
  const draw = () => {
    if (isBusy() || status() === 'consent') {
      return
    }

    discardClient()
    setCards(drawTarotCards({count: count()}))
    setOutput('')
    setError(null)
    readingQuestion = question().trim()
    readingLocale = props.locale()
    checkModel()
  }
  const retry = () => {
    if (cards().length === 0 || isBusy() || status() === 'consent') {
      return
    }

    discardClient()
    readingQuestion = question().trim()
    readingLocale = props.locale()
    setOutput('')
    setError(null)
    checkModel()
  }
  const waitForDownload = async () => {
    revision += 1
    readingQuestion = question().trim()
    const downloadRevision = revision
    setStatus('downloading')
    try {
      const cached: ModelDownloadResult = {status: 'complete'}
      const textDownload = missingText()
        ? modelDownload.startTextModel(MODEL_ID)
        : Promise.resolve(cached)
      const voiceDownload = missingVoice()
        ? modelDownload.startVoiceModel(DEFAULT_DIALOGUE_MODEL_ID)
        : Promise.resolve(cached)
      const results = await Promise.all([textDownload, voiceDownload])
      const result = results.find((value) => value.status !== 'complete') ?? cached
      if (disposed || downloadRevision !== revision) {
        return
      }

      switch (result.status) {
        case 'complete':
          startGeneration()
          return
        case 'cancelled':
          setStatus('idle')
          return
        case 'error':
          setError(result.message)
          setStatus('error')
          return
      }

      result satisfies never
    } catch (cause: unknown) {
      if (disposed || downloadRevision !== revision) {
        return
      }
      setError(cause instanceof Error ? cause.message : '모델을 내려받지 못했어요.')
      setStatus('error')
    }
  }
  const startDownload = async () => {
    if (status() === 'consent') {
      await waitForDownload()
    }
  }
  const resetReading = () => {
    if (isBusy()) {
      return
    }
    discardClient()
    setCards([])
    setOutput('')
    setError(null)
    setStatus('idle')
  }
  const setCount = (nextCount: TarotDrawCount) => {
    if (nextCount === count() || isBusy()) {
      return
    }
    setDrawCount(nextCount)
    resetReading()
  }
  const setQuestion = (nextQuestion: string) => {
    const limitedQuestion = nextQuestion.slice(0, MAXIMUM_QUESTION_LENGTH)
    if (isBusy() || limitedQuestion === question()) {
      return
    }
    setDraftQuestion(limitedQuestion)
  }
  const cancelDownloadConsent = () => {
    if (status() === 'consent') {
      setStatus('idle')
    }
  }

  createEffect(() => {
    const currentLocale = props.locale()
    if (currentLocale === readingLocale) {
      return
    }

    cancel()
    readingLocale = currentLocale
    setOutput('')
    setError(null)
    setStatus('idle')
  })

  onCleanup(() => {
    disposed = true
    discardClient()
  })

  return {
    cancel,
    cancelDownload,
    cancelDownloadConsent,
    cards,
    count,
    downloadKind,
    downloadSize,
    draw,
    error,
    output,
    progress,
    question,
    retry,
    setCount,
    setQuestion,
    setShowCardsUpright,
    showCardsUpright,
    startDownload,
    status,
  }
}
