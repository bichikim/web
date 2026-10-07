import {resolveTextModelAssetUrl} from './resolve-text-model-asset-url'
import {createModelStorage, type ModelStorage} from '../model-storage'
import {isPomoAssetBundled} from '../product-assets'
import {getTextModelImplementation, type TextModelId} from './model'

const MODEL_WEIGHT_NAMES = ['embed_tokens', 'decoder_model_merged'] as const
const MODEL_WEIGHT_EXTENSIONS = ['onnx', 'onnx_data'] as const

export interface IsTextModelDownloadedOptions {
  readonly modelId: TextModelId
  readonly storage?: ModelStorage
}

export const getTextModelWeightUrls = (modelId: TextModelId): ReadonlyArray<string> => {
  const model = getTextModelImplementation(modelId)
  if (model.architecture === 'lfm-2-gguf') {
    return [resolveTextModelAssetUrl({...model, relativePath: model.weightFile})]
  }

  const weightNames = model.architecture === 'lfm-2' ? ['model'] : MODEL_WEIGHT_NAMES

  return weightNames.flatMap((name) =>
    MODEL_WEIGHT_EXTENSIONS.map((extension) =>
      resolveTextModelAssetUrl({
        ...model,
        relativePath: `onnx/${name}_${model.quantization}.${extension}`,
      }),
    ),
  )
}

/** Reports whether every model weight file required by a text model is stored. */
export const isTextModelDownloaded = async (
  options: IsTextModelDownloadedOptions,
): Promise<boolean> => {
  const modelWeightUrls = getTextModelWeightUrls(options.modelId)
  if (modelWeightUrls.every(isPomoAssetBundled)) {
    return true
  }

  const storage = options.storage ?? createModelStorage()
  const results = await Promise.all(modelWeightUrls.map((url) => storage.get(url)))
  return results.every((result) => result.ok && result.value !== null)
}
