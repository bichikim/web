import {useDefaultTextModel} from 'src/features/text-generation/use-default-text-model'
import type {DefaultTextModelId} from 'src/features/text-generation/settings'
import {supportsTextModel} from 'src/features/text-generation/supports-text-model'
import {type Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import {type ModelDownloadResult, useModelDownload} from '../model-download'
import {getTextModel, isTextModelDownloaded, supportsWebGpu} from '../text-generation'
import {createTarotClient, type TarotClient} from './client'
import {
  type DrawnTarotCard,
  drawTarotCards,
  TAROT_DRAW_COUNTS,
  type TarotDrawCount,
  type TarotLocale,
} from './cards'
import type {TarotWorkerResponse} from './messages'

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
  readonly downloadKind: Accessor<'text' | null>
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

/** Owns the selected cards and one local interpretation at a time. */
// oxlint-disable-next-line eslint/max-lines-per-function -- One owner coordinates the draw and worker lifecycle.
export const useTarotReading = (props: UseTarotReadingProps): TarotReadingController => {
  const defaultModelId = useDefaultTextModel()
  const defaultModelSelection = createMemo(
    (previous: {readonly modelId: DefaultTextModelId; readonly revision: number}) => {
      const modelId = defaultModelId()
      return modelId === previous.modelId ? previous : {modelId, revision: previous.revision + 1}
    },
    {modelId: defaultModelId(), revision: 0},
  )
  const [readingModelSelection, setReadingModelSelection] = createSignal(defaultModelSelection())
  const modelDownload = useModelDownload()
  const [count, setDrawCount] = createSignal<TarotDrawCount>(TAROT_DRAW_COUNTS.three)
  const [question, setDraftQuestion] = createSignal('')
  const [showCardsUpright, setShowCardsUpright] = createSignal(true)
  const [cards, setCards] = createSignal<ReadonlyArray<DrawnTarotCard>>([])
  const [output, setOutput] = createSignal('')
  const [readingStatus, setStatus] = createSignal<TarotReadingStatus>('idle')
  const status = createMemo(() => {
    const currentStatus = readingStatus()
    const selection = defaultModelSelection()
    const readingSelection = readingModelSelection()
    const {modelId} = selection
    if (
      (currentStatus === 'unsupported' || currentStatus === 'checking') &&
      (selection.revision !== readingSelection.revision || modelId !== readingSelection.modelId)
    ) {
      return supportsTextModel({modelId, webGpu: supportsWebGpu()}) ? 'idle' : 'unsupported'
    }
    return currentStatus
  })
  const [error, setError] = createSignal<string | null>(null)
  const [modelProgress, setModelProgress] = createSignal<number | null>(null)
  const [missingText, setMissingText] = createSignal(false)
  const readingContext: {locale: TarotLocale; question: string} = {
    locale: props.locale(),
    question: '',
  }
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
          item.target.kind === 'text' &&
          item.target.modelId === readingModelSelection().modelId,
      )
  const downloadKind = () => {
    const kind = activeDownload()?.target.kind
    return kind === 'text' ? kind : null
  }
  const downloadSize = () =>
    missingText() ? getTextModel(readingModelSelection().modelId).downloadSize : ''
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
    if (!isBusy() && readingStatus() !== 'checking' && status() !== 'consent') {
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
    if (missingText()) {
      modelDownload.cancel({kind: 'text', modelId: readingModelSelection().modelId})
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
  const startGeneration = (modelId: DefaultTextModelId) => {
    const selectedCards = cards()
    if (selectedCards.length === 0 || disposed) {
      return
    }

    setStatus('preparing')
    setModelProgress(null)
    try {
      client ??= createTarotClient({modelId, onResponse: handleResponse})
      revision += 1
      const requestId = `tarot-${revision}`
      activeRequestId = requestId
      client.generate({
        cards: selectedCards,
        locale: readingContext.locale,
        modelId,
        question: readingContext.question,
        requestId,
        type: 'generate',
      })
    } catch (cause: unknown) {
      discardClient()
      setError(cause instanceof Error ? cause.message : '타로 해석을 시작하지 못했어요.')
      setStatus('error')
    }
  }
  const checkModel = async (modelId: DefaultTextModelId) => {
    revision += 1
    const checkRevision = revision
    const readingSelection = defaultModelSelection()
    setReadingModelSelection(readingSelection)
    if (!supportsTextModel({modelId, webGpu: supportsWebGpu()})) {
      setStatus('unsupported')
      return
    }

    setStatus('checking')
    setError(null)
    try {
      const textDownloaded = await isTextModelDownloaded({modelId})
      if (
        disposed ||
        checkRevision !== revision ||
        readingSelection.revision !== defaultModelSelection().revision ||
        modelId !== defaultModelId()
      ) {
        return
      }

      setMissingText(!textDownloaded)
      const downloads = modelDownload.downloads()
      if (textDownloaded) {
        startGeneration(modelId)
      } else if (
        downloads.some(
          (item) =>
            item.target.kind === 'text' &&
            item.target.modelId === modelId &&
            item.status !== 'error',
        )
      ) {
        await waitForDownload()
      } else {
        setStatus('consent')
      }
    } catch (cause: unknown) {
      if (
        disposed ||
        checkRevision !== revision ||
        readingSelection.revision !== defaultModelSelection().revision ||
        modelId !== defaultModelId()
      ) {
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
    readingContext.question = question().trim()
    readingContext.locale = props.locale()
    checkModel(defaultModelId())
  }
  const retry = () => {
    if (cards().length === 0 || isBusy() || status() === 'consent') {
      return
    }

    discardClient()
    readingContext.question = question().trim()
    readingContext.locale = props.locale()
    setOutput('')
    setError(null)
    checkModel(defaultModelId())
  }
  const waitForDownload = async () => {
    revision += 1
    const {modelId} = readingModelSelection()
    readingContext.question = question().trim()
    const downloadRevision = revision
    setStatus('downloading')
    try {
      const cached: ModelDownloadResult = {status: 'complete'}
      const result = await (missingText()
        ? modelDownload.startTextModel(modelId)
        : Promise.resolve(cached))
      if (disposed || downloadRevision !== revision) {
        return
      }

      switch (result.status) {
        case 'complete':
          startGeneration(modelId)
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
  const setCount = (nextCount: TarotDrawCount) => {
    if (nextCount === count() || isBusy()) {
      return
    }
    setDrawCount(nextCount)
    discardClient()
    setCards([])
    setOutput('')
    setError(null)
    setStatus('idle')
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
    if (currentLocale === readingContext.locale) {
      return
    }

    cancel()
    readingContext.locale = currentLocale
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
