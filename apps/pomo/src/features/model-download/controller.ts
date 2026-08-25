import {type Accessor, createSignal} from 'solid-js'

import {
  createSupertonicClient,
  getSupertonicErrorMessage,
  getSupertonicModel,
  type SupertonicClient,
  type SupertonicModelId,
} from '../supertonic'
import type {SupertonicProgress} from '../supertonic/messages'
import {getTextModel, type TextModelId} from '../text-generation/model'
import {
  createTextModelDownloadClient,
  type CreateTextModelDownloadClientOptions,
  type TextModelDownloadClient,
} from './text-client'

export interface TextModelDownloadTarget {
  readonly kind: 'text'
  readonly modelId: TextModelId
}

export interface VoiceModelDownloadTarget {
  readonly kind: 'voice'
  readonly modelId: SupertonicModelId
}

export type ModelDownloadTarget = TextModelDownloadTarget | VoiceModelDownloadTarget

interface IdleModelDownloadState {
  readonly status: 'idle'
}

export interface LoadingModelDownloadState {
  readonly label: string
  readonly percentage: number
  readonly status: 'loading'
  readonly target: ModelDownloadTarget
}

export interface ErrorModelDownloadState {
  readonly label: string
  readonly message: string
  readonly status: 'error'
  readonly target: ModelDownloadTarget
}

export type ModelDownloadState =
  | ErrorModelDownloadState
  | IdleModelDownloadState
  | LoadingModelDownloadState

interface CompleteModelDownloadResult {
  readonly status: 'complete'
}

interface CancelledModelDownloadResult {
  readonly status: 'cancelled'
}

interface ErrorModelDownloadResult {
  readonly message: string
  readonly status: 'error'
}

export type ModelDownloadResult =
  | CancelledModelDownloadResult
  | CompleteModelDownloadResult
  | ErrorModelDownloadResult

export interface ModelDownloadController {
  readonly cancel: () => void
  readonly dismissError: () => void
  readonly dispose: () => void
  readonly startTextModel: (modelId: TextModelId) => Promise<ModelDownloadResult>
  readonly startVoiceModel: (modelId: SupertonicModelId) => Promise<ModelDownloadResult>
  readonly state: Accessor<ModelDownloadState>
}

export interface ModelDownloadRuntime {
  readonly createTextClient: (
    options: CreateTextModelDownloadClientOptions,
  ) => TextModelDownloadClient
  readonly createVoiceClient: () => SupertonicClient
}

const DEFAULT_RUNTIME: ModelDownloadRuntime = {
  createTextClient: createTextModelDownloadClient,
  createVoiceClient: createSupertonicClient,
}
const NOOP_DOWNLOAD_RESOLVER = () => undefined
const MAXIMUM_PERCENTAGE = 100

interface ModelDownloadCallbacks {
  readonly onError: (message: string) => void
  readonly onProgress: (percentage: number) => void
  readonly onReady: () => void
}

interface ModelDownloadClient {
  readonly dispose: () => void
  readonly prepare: () => void
}

interface ActiveDownload {
  readonly client: ModelDownloadClient
  readonly promise: Promise<ModelDownloadResult>
  readonly resolve: (result: ModelDownloadResult) => void
  readonly session: object
  readonly target: ModelDownloadTarget
}

interface StartModelDownloadOptions {
  readonly createClient: (callbacks: ModelDownloadCallbacks) => ModelDownloadClient
  readonly label: string
  readonly target: ModelDownloadTarget
}

const isSameTarget = (left: ModelDownloadTarget, right: ModelDownloadTarget) =>
  left.kind === right.kind && left.modelId === right.modelId

const getPercentage = (progress: SupertonicProgress) =>
  progress.totalBytes > 0
    ? Math.min(
        MAXIMUM_PERCENTAGE,
        Math.round((progress.loadedBytes / progress.totalBytes) * MAXIMUM_PERCENTAGE),
      )
    : 0

const getUnknownErrorMessage = (error: unknown) =>
  error instanceof Error && error.message.length > 0
    ? error.message
    : '모델 파일을 내려받지 못했어요.'

const createTextDownloadOptions = (
  runtime: ModelDownloadRuntime,
  modelId: TextModelId,
): StartModelDownloadOptions => ({
  createClient: (callbacks) => {
    const client = runtime.createTextClient({
      onResponse: (response) => {
        switch (response.type) {
          case 'error':
            callbacks.onError(response.message)
            return
          case 'loading':
            callbacks.onProgress(response.percentage)
            return
          case 'ready':
            callbacks.onReady()
            return
        }

        response satisfies never
      },
    })
    return {
      dispose: client.dispose,
      prepare: () => client.prepare({modelId, type: 'prepare'}),
    }
  },
  label: getTextModel(modelId).label,
  target: {kind: 'text', modelId},
})

const createVoiceDownloadOptions = (
  runtime: ModelDownloadRuntime,
  modelId: SupertonicModelId,
): StartModelDownloadOptions => ({
  createClient: (callbacks) => {
    const client = runtime.createVoiceClient()
    return {
      dispose: client.dispose,
      prepare: () => {
        client
          .initialize({
            modelId,
            onProgress: (progress) => callbacks.onProgress(getPercentage(progress)),
            onStatus: () => undefined,
          })
          .then((result) => {
            if (result.ok) {
              callbacks.onReady()
            } else {
              callbacks.onError(getSupertonicErrorMessage(result.error))
            }
          })
          .catch((error: unknown) => callbacks.onError(getUnknownErrorMessage(error)))
      },
    }
  },
  label: `${getSupertonicModel(modelId).label} 음성`,
  target: {kind: 'voice', modelId},
})

export const createModelDownloadController = (
  runtime: ModelDownloadRuntime = DEFAULT_RUNTIME,
): ModelDownloadController => {
  const [state, setState] = createSignal<ModelDownloadState>({status: 'idle'})
  let activeDownload: ActiveDownload | null = null

  const finish = (download: ActiveDownload, result: ModelDownloadResult) => {
    if (activeDownload !== download) {
      return
    }

    download.client.dispose()
    activeDownload = null
    download.resolve(result)
  }

  const start = (options: StartModelDownloadOptions) => {
    if (activeDownload !== null) {
      if (isSameTarget(activeDownload.target, options.target)) {
        return activeDownload.promise
      }

      return Promise.resolve({
        message: '다른 모델을 내려받고 있어요. 완료하거나 취소한 뒤 다시 시도해 주세요.',
        status: 'error',
      } satisfies ErrorModelDownloadResult)
    }

    let resolveDownload: (result: ModelDownloadResult) => void = NOOP_DOWNLOAD_RESOLVER
    const promise = new Promise<ModelDownloadResult>((resolve) => {
      resolveDownload = resolve
    })
    const session = {}
    const getCurrentDownload = () => {
      const download = activeDownload
      return download !== null && download.session === session ? download : null
    }
    const callbacks: ModelDownloadCallbacks = {
      onError: (message) => {
        const download = getCurrentDownload()

        if (download === null) {
          return
        }

        setState({
          label: options.label,
          message,
          status: 'error',
          target: options.target,
        })
        finish(download, {message, status: 'error'})
      },
      onProgress: (percentage) => {
        if (getCurrentDownload() !== null) {
          setState({label: options.label, percentage, status: 'loading', target: options.target})
        }
      },
      onReady: () => {
        const download = getCurrentDownload()

        if (download === null) {
          return
        }

        setState({status: 'idle'})
        finish(download, {status: 'complete'})
      },
    }
    let client: ModelDownloadClient

    try {
      client = options.createClient(callbacks)
    } catch (error: unknown) {
      const message = getUnknownErrorMessage(error)
      setState({label: options.label, message, status: 'error', target: options.target})
      return Promise.resolve({message, status: 'error'} satisfies ErrorModelDownloadResult)
    }

    const download = {client, promise, resolve: resolveDownload, session, target: options.target}
    activeDownload = download
    setState({label: options.label, percentage: 0, status: 'loading', target: options.target})
    try {
      client.prepare()
    } catch (error: unknown) {
      callbacks.onError(getUnknownErrorMessage(error))
    }
    return promise
  }

  const startTextModel = (modelId: TextModelId) =>
    start(createTextDownloadOptions(runtime, modelId))
  const startVoiceModel = (modelId: SupertonicModelId) =>
    start(createVoiceDownloadOptions(runtime, modelId))

  const cancel = () => {
    const download = activeDownload

    if (download === null) {
      return
    }

    setState({status: 'idle'})
    finish(download, {status: 'cancelled'})
  }

  const dismissError = () => {
    if (state().status === 'error') {
      setState({status: 'idle'})
    }
  }

  return {
    cancel,
    dismissError,
    dispose: cancel,
    startTextModel,
    startVoiceModel,
    state,
  }
}
