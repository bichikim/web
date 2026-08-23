import {createModelStorage, type ModelStorage} from '../model-storage'
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

  return MODEL_WEIGHT_NAMES.flatMap((name) =>
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
  const storage = options.storage ?? createModelStorage()
  const results = await Promise.all(
    getModelWeightUrls(options.modelId).map((url) => storage.get(url)),
  )
  return results.every((result) => result.ok && result.value !== null)
}
