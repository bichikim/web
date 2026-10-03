// oxlint-disable eslint-js/camelcase -- Wllama options follow its external contract.
import type {ProgressInfo} from '@huggingface/transformers'
import type {Wllama} from '@wllama/wllama/esm/index.js'
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url'

import type {ModelStorage, ModelStorageError} from '../model-storage'
import type {GgufTextModelImplementation} from './model'

export interface GgufModelDependencies {
  readonly fetcher: typeof fetch
  readonly storage: Pick<ModelStorage, 'get' | 'set'>
  readonly onStorageError: (error: ModelStorageError) => void
  readonly onStored?: (url: string) => Promise<void>
}

interface LoadGgufModelOptions extends GgufModelDependencies {
  readonly model: GgufTextModelImplementation
  readonly onProgress: (progress: ProgressInfo) => void
}

const PERCENT_SCALE = 100

const loadWeights = async ({
  model,
  onProgress,
  onStored,
  storage,
  fetcher,
  onStorageError,
}: LoadGgufModelOptions): Promise<Blob> => {
  const path = model.assetSource.pathTemplate
    .replaceAll('{model}', model.repositoryId)
    .replaceAll('{revision}', model.assetSource.revision)
  const url = new URL(`${path}${model.weightFile}`, model.assetSource.host).href
  const cached = await storage.get(url)
  if (cached.ok && cached.value !== null) {
    await onStored?.(url)
    return cached.value.blob()
  }
  if (!cached.ok) {
    onStorageError(cached.error)
  }

  const response = await fetcher(url)
  if (!response.ok || response.body === null) {
    throw new Error(`GGUF 모델을 내려받지 못했어요: HTTP ${response.status}`)
  }
  const total = Number(response.headers.get('content-length') ?? 0)
  let loaded = 0
  const stream = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.byteLength
        onProgress({
          files: {[model.weightFile]: {loaded, total}},
          loaded,
          name: model.repositoryId,
          progress: total > 0 ? (loaded / total) * PERCENT_SCALE : 0,
          status: 'progress_total',
          total,
        })
        controller.enqueue(chunk)
      },
    }),
  )
  const blob = await new Response(stream).blob()
  const stored = await storage.set(url, new Response(blob))
  if (stored.ok) {
    await onStored?.(url)
  } else {
    onStorageError(stored.error)
  }
  return blob
}

/** Loads a GGUF checkpoint into a browser inference session. */
export const loadGgufModel = async (options: LoadGgufModelOptions): Promise<Wllama> => {
  const {Wllama} = await import('@wllama/wllama/esm/index.js')
  const weights = await loadWeights(options)
  const model = new Wllama({default: wasmUrl})
  try {
    await model.loadModel([weights], {
      jinja: true,
      n_batch: 256,
      n_ctx: 8192,
      reasoning: true,
    })
    return model
  } catch (error: unknown) {
    await model.exit().catch(() => undefined)
    throw error
  }
}
