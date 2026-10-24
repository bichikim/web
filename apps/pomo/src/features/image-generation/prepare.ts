import type {
  ModelDownloadController,
  ModelDownloadResult,
  ModelDownloadTarget,
} from '../model-download'
import {isTextModelDownloaded, type TextModelId} from '../text-generation'
import type {ImageVariant} from './settings'

export interface PrepareImageModelsOptions {
  readonly downloads: ModelDownloadController
  readonly modelId: TextModelId
  readonly variant: ImageVariant
  readonly signal: AbortSignal
}

const requireCompleted = (result: ModelDownloadResult) => {
  switch (result.status) {
    case 'complete':
      return
    case 'cancelled':
      throw new DOMException('Model download cancelled', 'AbortError')
    case 'error':
      throw new Error(result.message)
  }
  result satisfies never
}

/** Downloads both models through the shared queue before inference starts. */
export const prepareImageModels = async (options: PrepareImageModelsOptions) => {
  options.signal.throwIfAborted()
  const textReady = await isTextModelDownloaded({modelId: options.modelId})
  options.signal.throwIfAborted()
  const imageTarget: ModelDownloadTarget = {kind: 'image', modelId: options.variant}
  const textTarget: ModelDownloadTarget = {kind: 'text', modelId: options.modelId}
  const pending = new Set<ModelDownloadTarget>([imageTarget, ...(textReady ? [] : [textTarget])])
  const cancel = () => {
    for (const target of pending) {
      pending.delete(target)
      options.downloads.cancel(target)
    }
  }
  const completed = (target: ModelDownloadTarget, result: ModelDownloadResult) => {
    pending.delete(target)
    requireCompleted(result)
  }
  options.signal.addEventListener('abort', cancel, {once: true})
  try {
    const text = textReady
      ? Promise.resolve<ModelDownloadResult>({status: 'complete'})
      : options.downloads.startTextModel(options.modelId)
    const image = options.downloads.startImageModel(options.variant)
    await Promise.all([
      text.then((result) => completed(textTarget, result)),
      image.then((result) => completed(imageTarget, result)),
    ])
    options.signal.throwIfAborted()
  } catch (error) {
    cancel()
    throw error
  } finally {
    options.signal.removeEventListener('abort', cancel)
  }
}
