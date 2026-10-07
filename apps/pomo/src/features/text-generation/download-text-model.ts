// oxlint-disable no-await-in-loop -- Sequential file writes bound download memory independently of model size.
import type {ModelStorage, ModelStorageError, ResumableModelFetch} from '../model-storage'
import {getTextModelWeightUrls} from './download'
import {getTextModelCacheKey} from './get-text-model-cache-key'
import {getTextModelImplementation, type TextModelId} from './model'
import {createTextGenerationProgress, type TextGenerationProgress} from './progress'
import {resolveTextModelAssetUrl} from './resolve-text-model-asset-url'

interface TextModelAsset {
  readonly optional: boolean
  readonly url: string
}
interface DownloadAsset extends TextModelAsset {
  readonly cached: boolean
  readonly total: number
}
export interface DownloadTextModelOptions {
  readonly modelId: TextModelId
  readonly onProgress: (progress: TextGenerationProgress) => void
  readonly runtime: TextModelDownloadRuntime
}

export interface TextModelDownloadRuntime {
  readonly isAssetBundled: (url: string) => boolean
  readonly onStorageError: (error: ModelStorageError) => void
  readonly resumable: ResumableModelFetch
  readonly storage: ModelStorage
}

const getAssets = (modelId: TextModelId): ReadonlyArray<TextModelAsset> => {
  const model = getTextModelImplementation(modelId)
  const prefix = model.architecture === 'lfm-2-gguf' ? `${model.tokenizerSubfolder}/` : ''
  const common = ['config.json', 'tokenizer.json', 'tokenizer_config.json']
  const optional = ['generation_config.json', 'chat_template.jinja']
  const metadata = (() => {
    switch (model.architecture) {
      case 'gemma-4':
        return {optional, required: [...common, 'processor_config.json']}
      case 'qwen-3.5':
        return {
          optional,
          required: [...common, 'preprocessor_config.json', 'processor_config.json'],
        }
      case 'lfm-2-gguf':
        return {optional: [], required: [...common, 'chat_template.jinja']}
      case 'lfm-2':
        return {optional, required: common}
    }
    model satisfies never
  })()
  const resolve = (file: string) =>
    resolveTextModelAssetUrl({...model, relativePath: `${prefix}${file}`})
  return [
    ...metadata.required.map((file) => ({optional: false, url: resolve(file)})),
    ...metadata.optional.map((file) => ({optional: true, url: resolve(file)})),
    ...getTextModelWeightUrls(modelId).map((url) => ({optional: false, url})),
  ]
}

interface InspectAssetOptions {
  readonly asset: TextModelAsset
  readonly runtime: TextModelDownloadRuntime
}

const inspectAsset = async (options: InspectAssetOptions): Promise<DownloadAsset | null> => {
  const {asset, runtime} = options
  const {storage, resumable, onStorageError} = runtime
  const cached = await storage.get(getTextModelCacheKey(asset.url))
  if (!cached.ok) {
    onStorageError(cached.error)
  }
  if (cached.ok && cached.value !== null) {
    const total = Number(cached.value.headers.get('content-length') ?? 0)
    await cached.value.body?.cancel()
    return {...asset, cached: true, total}
  }
  const response = await resumable.fetch(asset.url, {method: 'HEAD'})
  const HTTP_NOT_FOUND = 404
  if (asset.optional && response.status === HTTP_NOT_FOUND) {
    return null
  }
  if (!response.ok) {
    throw new Error(`모델 파일을 확인하지 못했어요: HTTP ${response.status} (${asset.url})`)
  }
  return {...asset, cached: false, total: Number(response.headers.get('content-length') ?? 0)}
}

interface StoreAssetOptions {
  readonly asset: DownloadAsset
  readonly onChunk: (bytes: number) => void
  readonly runtime: TextModelDownloadRuntime
}

const storeAsset = async (options: StoreAssetOptions) => {
  const {asset, runtime} = options
  const {resumable, storage, onStorageError} = runtime
  const storageKey = getTextModelCacheKey(asset.url)
  if (!asset.cached) {
    const response = await resumable.fetch(asset.url)
    if (!response.ok || response.body === null) {
      throw new Error(`모델 파일을 내려받지 못했어요: HTTP ${response.status} (${asset.url})`)
    }
    const stream = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          options.onChunk(chunk.byteLength)
          controller.enqueue(chunk)
        },
      }),
    )
    const result = await storage.set(storageKey, new Response(stream, {headers: response.headers}))
    if (!result.ok) {
      throw new Error('모델 파일을 기기에 저장하지 못했어요.', {cause: result.error.cause})
    }
  }
  if (storageKey !== asset.url) {
    const cleanup = await storage.delete(asset.url)
    if (!cleanup.ok) {
      onStorageError(cleanup.error)
    }
  }
  await resumable.deletePartial(asset.url)
}

/** Downloads and persists text model assets without allocating an inference session. */
export const downloadTextModel = async (options: DownloadTextModelOptions): Promise<void> => {
  const {runtime} = options
  const assets = getAssets(options.modelId)
  if (assets.every((asset) => runtime.isAssetBundled(asset.url))) {
    return
  }
  const inspected = await Promise.all(assets.map((asset) => inspectAsset({asset, runtime})))
  const downloads = inspected.filter((asset) => asset !== null)
  const files = Object.fromEntries(
    downloads.map((asset) => [
      asset.url,
      {loaded: asset.cached ? asset.total : 0, total: asset.total},
    ]),
  )
  const reportProgress = () =>
    options.onProgress(
      createTextGenerationProgress({
        files,
        loadedBytes: Object.values(files).reduce((total, file) => total + file.loaded, 0),
        totalBytes: Object.values(files).reduce((total, file) => total + file.total, 0),
      }),
    )
  reportProgress()
  for (const asset of downloads) {
    await storeAsset({
      asset,
      onChunk: (bytes) => {
        files[asset.url].loaded += bytes
        reportProgress()
      },
      runtime,
    })
  }
}
