import {createModelStorage, type ModelStorage} from '../model-storage'
import {isPomoAssetBundled} from '../product-assets'
import {getTextModelImplementation, type TextModelId} from './model'

const MODEL_WEIGHT_NAMES = ['embed_tokens', 'decoder_model_merged'] as const
const MODEL_WEIGHT_EXTENSIONS = ['onnx', 'onnx_data'] as const

export interface IsTextModelDownloadedOptions {
  readonly modelId: TextModelId
  readonly storage?: ModelStorage
}

const getModelWeightUrls = (modelId: TextModelId): ReadonlyArray<string> => {
  const model = getTextModelImplementation(modelId)
  const modelPath = model.assetSource.pathTemplate
    .replaceAll('{model}', model.repositoryId)
    .replaceAll('{revision}', model.assetSource.revision)

  if (model.architecture === 'lfm-2-gguf') {
    return [new URL(`${modelPath}${model.weightFile}`, model.assetSource.host).href]
  }

  const weightNames = model.architecture === 'lfm-2' ? ['model'] : MODEL_WEIGHT_NAMES

  return weightNames.flatMap((name) =>
    MODEL_WEIGHT_EXTENSIONS.map(
      (extension) =>
        new URL(
          `${modelPath}onnx/${name}_${model.quantization}.${extension}`,
          model.assetSource.host,
        ).href,
    ),
  )
}

/** Reports whether every model weight file required by a text model is stored. */
export const isTextModelDownloaded = async (
  options: IsTextModelDownloadedOptions,
): Promise<boolean> => {
  const modelWeightUrls = getModelWeightUrls(options.modelId)
  if (modelWeightUrls.every(isPomoAssetBundled)) {
    return true
  }

  const storage = options.storage ?? createModelStorage()
  const results = await Promise.all(modelWeightUrls.map((url) => storage.get(url)))
  return results.every((result) => result.ok && result.value !== null)
}
