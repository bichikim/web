import {createModelStorage, type ModelStorage} from '../model-storage'
import {getSupertonicModel, getSupertonicModelFileUrl, type SupertonicModelId} from './model'

export interface IsSupertonicModelDownloadedOptions {
  readonly modelId: SupertonicModelId
  readonly storage?: ModelStorage
}

/** Reports whether every large model file required by a Supertonic profile is cached. */
export const isSupertonicModelDownloaded = async (
  options: IsSupertonicModelDownloadedOptions,
): Promise<boolean> => {
  const model = getSupertonicModel(options.modelId)
  const storage = options.storage ?? createModelStorage()
  const results = await Promise.all(
    model.files.map((file) => storage.get(getSupertonicModelFileUrl(model, file))),
  )
  return results.every((result) => result.ok && result.value !== null)
}
