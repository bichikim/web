import {jsonObject, jsonString} from './json-fields'
import {type CubismArchive, resolveCubismAsset} from './read-cubism-archive'

export const readVtubeSettings = (
  archive: CubismArchive,
  modelPath: string,
): Record<string, unknown> | undefined => {
  const path = modelPath.replace(/\.model3\.json$/iu, '.vtube.json')
  if (!archive.entries.has(path)) {
    return undefined
  }
  const settings = archive.readJson(path)
  const references = jsonObject(settings.FileReferences)
  return resolveCubismAsset(path, jsonString(references.Model)) === modelPath ? settings : undefined
}
