import {cacheDirectory, prepareModelAsset} from '@winter-love/model-cache'
import path from 'node:path'
import manifest from '../assets/model.json' with {type: 'json'}

export const modelDirectory = (): string =>
  path.join(cacheDirectory('io.winterlove.models'), 'multilingual-e5-small', manifest.revision)

/** Prepares pinned E5 files in the shared OS cache and reuses verified files offline. */
export const prepareE5Model = async (): Promise<void> => {
  await Promise.all(
    manifest.files.map((file) => prepareModelAsset(modelDirectory(), file, file.url)),
  )
}
