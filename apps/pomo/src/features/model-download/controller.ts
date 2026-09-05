import {type Accessor} from 'solid-js'
import {createDownloadQueue} from './queue'
import {createImageModelDownloadClient} from './image-client'
import type {ImageVariant} from '../image-generation/settings'

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

export interface ImageModelDownloadTarget {
  readonly kind: 'image'
  readonly modelId: ImageVariant
}

export type ModelDownloadTarget =
  | TextModelDownloadTarget
  | VoiceModelDownloadTarget
  | ImageModelDownloadTarget

export interface QueuedModelDownloadState {
  readonly label: string
  readonly status: 'queued'
  readonly target: ModelDownloadTarget
}

export type ModelDownloadItem =
  | LoadingModelDownloadState
  | ErrorModelDownloadState
  | QueuedModelDownloadState

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
  readonly cancel: (target?: ModelDownloadTarget) => void
  readonly dismissError: (target?: ModelDownloadTarget) => void
  readonly dispose: () => void
  readonly downloads: Accessor<ReadonlyArray<ModelDownloadItem>>
  readonly startImageModel: (modelId: ImageVariant) => Promise<ModelDownloadResult>
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
const MAXIMUM_PERCENTAGE = 100

export interface ModelDownloadCallbacks {
  readonly onError: (message: string) => void
  readonly onProgress: (percentage: number) => void
  readonly onReady: () => void
}

export interface ModelDownloadClient {
  readonly dispose: () => void
  readonly prepare: () => void
}

export interface StartModelDownloadOptions {
  readonly createClient: (callbacks: ModelDownloadCallbacks) => ModelDownloadClient
  readonly label: string
  readonly target: ModelDownloadTarget
}

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
  const queue = createDownloadQueue()
  return {
    cancel: queue.cancel,
    dismissError: queue.dismissError,
    dispose: queue.dispose,
    downloads: queue.downloads,
    startImageModel: (modelId) =>
      queue.start({
        createClient: (callbacks) => createImageModelDownloadClient({callbacks, modelId}),
        label: `Bonsai 4B · ${modelId === 'ternary' ? 'Ternary' : '1-bit'}`,
        target: {kind: 'image', modelId},
      }),
    startTextModel: (modelId) => queue.start(createTextDownloadOptions(runtime, modelId)),
    startVoiceModel: (modelId) => queue.start(createVoiceDownloadOptions(runtime, modelId)),
    state: queue.state,
  }
}
