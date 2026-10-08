import {type Accessor, createSignal, onCleanup} from 'solid-js'
import {
  type ModelDownloadItem,
  type ModelDownloadResult,
  type TextModelDownloadTarget,
  useModelDownload,
} from '../model-download'
import {getTextModel, isTextModelDownloaded, supportsWebGpu} from '../text-generation'
import {useDefaultTextModel} from '../text-generation/use-default-text-model'
import type {DefaultTextModelId} from '../text-generation/settings'
import {supportsTextModel} from '../text-generation/supports-text-model'
import {calculateSajuReading, type SajuReadingInput} from './calculate-reading'
import {createSajuClient, type SajuClient} from './client'
import type {SajuGenerationResponse} from './generation-messages'
import type {GenerateSajuRequest} from './messages'

export type SajuReadingStatus =
  | 'checking'
  | 'complete'
  | 'consent'
  | 'downloading'
  | 'error'
  | 'generating'
  | 'idle'
  | 'preparing'
  | 'unsupported'

export interface SajuReadingDownloads {
  readonly cancel: (target: TextModelDownloadTarget) => void
  readonly downloads: Accessor<ReadonlyArray<ModelDownloadItem>>
  readonly startTextModel: (modelId: DefaultTextModelId) => Promise<ModelDownloadResult>
}

export interface SajuReadingServices {
  readonly createClient: (onResponse: (response: SajuGenerationResponse) => void) => SajuClient
  readonly defaultModelId: Accessor<DefaultTextModelId>
  readonly downloads: SajuReadingDownloads
  readonly downloadSize: (modelId: DefaultTextModelId) => string
  readonly isDownloaded: (modelId: DefaultTextModelId) => Promise<boolean>
  readonly supportsModel: (modelId: DefaultTextModelId) => boolean
}

export interface UseSajuReadingProps {
  readonly services?: SajuReadingServices
}

export interface SajuReadingController {
  readonly answer: Accessor<string>
  readonly canRetry: Accessor<boolean>
  readonly cancel: () => void
  readonly cancelDownload: () => void
  readonly cancelDownloadConsent: () => void
  readonly downloadSize: Accessor<string>
  readonly error: Accessor<string | null>
  readonly progress: Accessor<number | null>
  readonly retry: () => void
  readonly startDownload: () => Promise<void>
  readonly status: Accessor<SajuReadingStatus>
  readonly submit: (input: SajuReadingInput) => void
}

function createSajuReadingServices(): SajuReadingServices {
  const defaultModelId = useDefaultTextModel()
  const downloads = useModelDownload()
  return {
    createClient: createSajuClient,
    defaultModelId,
    downloads,
    downloadSize: (modelId) => getTextModel(modelId).downloadSize,
    isDownloaded: (modelId) => isTextModelDownloaded({modelId}),
    supportsModel: (modelId) => supportsTextModel({modelId, webGpu: supportsWebGpu()}),
  }
}

/** Coordinates a calculated answer and one local model interpretation. */
// oxlint-disable-next-line eslint/max-lines-per-function -- One owner coordinates calculation, downloads, and the Worker lifecycle.
export function useSajuReading(props: UseSajuReadingProps = {}): SajuReadingController {
  const services = props.services ?? createSajuReadingServices()
  const {downloads} = services
  const [answer, setAnswer] = createSignal('')
  const [error, setError] = createSignal<string | null>(null)
  const [status, setStatus] = createSignal<SajuReadingStatus>('idle')
  const [modelId, setModelId] = createSignal<DefaultTextModelId>(services.defaultModelId())
  const [modelProgress, setModelProgress] = createSignal<number | null>(null)
  const [missingModel, setMissingModel] = createSignal(false)
  let request: GenerateSajuRequest | null = null
  let client: SajuClient | null = null
  let activeRequestId: string | null = null
  let revision = 0
  let disposed = false

  const isBusy = () =>
    status() === 'checking' ||
    status() === 'downloading' ||
    status() === 'preparing' ||
    status() === 'generating'
  const canRetry = () => request !== null
  const activeDownload = () =>
    downloads
      .downloads()
      .find(
        (item) =>
          item.status === 'loading' &&
          item.target.kind === 'text' &&
          item.target.modelId === modelId(),
      )
  const progress = () => {
    const download = activeDownload()
    return status() === 'downloading' && download?.status === 'loading'
      ? download.percentage
      : modelProgress()
  }
  const downloadSize = () => (missingModel() ? services.downloadSize(modelId()) : '')
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
    setAnswer('')
    setError(null)
    setModelProgress(null)
    setStatus('idle')
  }
  const cancelDownload = () => {
    if (status() !== 'downloading') {
      return
    }
    cancel()
    downloads.cancel({kind: 'text', modelId: modelId()})
  }
  const handleResponse = (response: SajuGenerationResponse) => {
    if (disposed || response.requestId !== activeRequestId) {
      return
    }
    switch (response.type) {
      case 'progress':
        setModelProgress(response.percentage)
        return
      case 'started':
        setModelProgress(null)
        setStatus('generating')
        return
      case 'complete':
        setAnswer(response.text)
        setStatus('complete')
        activeRequestId = null
        return
      case 'error':
        setError(response.message)
        setStatus('error')
        discardClient()
        return
    }
    response satisfies never
  }
  const startGeneration = () => {
    if (request === null || disposed) {
      return
    }
    setStatus('preparing')
    setModelProgress(null)
    try {
      client ??= services.createClient(handleResponse)
      revision += 1
      activeRequestId = `saju-${revision}`
      client.generate({...request, modelId: modelId(), requestId: activeRequestId})
    } catch (cause: unknown) {
      discardClient()
      setError(cause instanceof Error ? cause.message : '사주 풀이를 시작하지 못했어요.')
      setStatus('error')
    }
  }
  const waitForDownload = async () => {
    revision += 1
    const currentRevision = revision
    setStatus('downloading')
    try {
      const result = await downloads.startTextModel(modelId())
      if (disposed || currentRevision !== revision) {
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
      if (disposed || currentRevision !== revision) {
        return
      }
      setError(cause instanceof Error ? cause.message : '모델을 내려받지 못했어요.')
      setStatus('error')
    }
  }
  const checkModel = async () => {
    setModelId(services.defaultModelId())
    const selectedId = modelId()
    if (!services.supportsModel(selectedId)) {
      setStatus('unsupported')
      return
    }
    revision += 1
    const currentRevision = revision
    setStatus('checking')
    setError(null)
    try {
      const downloaded = await services.isDownloaded(selectedId)
      if (disposed || currentRevision !== revision) {
        return
      }
      setMissingModel(!downloaded)
      if (downloaded) {
        startGeneration()
      } else if (
        downloads
          .downloads()
          .some(
            (item) =>
              item.target.kind === 'text' &&
              item.target.modelId === selectedId &&
              item.status !== 'error',
          )
      ) {
        await waitForDownload()
      } else {
        setStatus('consent')
      }
    } catch (cause: unknown) {
      if (disposed || currentRevision !== revision) {
        return
      }
      setError(cause instanceof Error ? cause.message : '모델 상태를 확인하지 못했어요.')
      setStatus('error')
    }
  }
  const submit = (input: SajuReadingInput) => {
    if (isBusy() || status() === 'consent') {
      return
    }
    discardClient()
    setAnswer('')
    setError(null)
    try {
      const result = calculateSajuReading(input)
      if (result.type === 'generate') {
        const {request: nextRequest} = result
        request = nextRequest
        checkModel()
      } else {
        request = null
        setAnswer(result.text)
        setStatus(result.type === 'answer' ? 'complete' : 'error')
        if (result.type === 'notice') {
          setError(result.text)
          setAnswer('')
        }
      }
    } catch (cause: unknown) {
      request = null
      setError(cause instanceof Error ? cause.message : '사주 계산에 실패했어요.')
      setStatus('error')
    }
  }
  const retry = () => {
    if (request === null || isBusy() || status() === 'consent') {
      return
    }
    discardClient()
    setAnswer('')
    setError(null)
    checkModel()
  }
  const cancelDownloadConsent = () => {
    if (status() === 'consent') {
      setStatus('idle')
    }
  }
  const startDownload = async () => {
    if (status() === 'consent') {
      await waitForDownload()
    }
  }

  onCleanup(() => {
    disposed = true
    discardClient()
  })

  return {
    answer,
    cancel,
    cancelDownload,
    cancelDownloadConsent,
    canRetry,
    downloadSize,
    error,
    progress,
    retry,
    startDownload,
    status,
    submit,
  }
}
