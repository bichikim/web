import {jsonArray, jsonObject, jsonString} from './json-fields'
import {type CubismArchive, resolveCubismAsset} from './read-cubism-archive'
import {readVtubeSettings} from './read-vtube-settings'
import {resolveVtubeAsset} from './resolve-vtube-asset'

interface CubismExpressionReference {
  readonly File: string
  readonly Name: string
}

const uniqueNames = (entries: ReadonlyArray<CubismExpressionReference>) => {
  const reserved = new Set(entries.map((entry) => entry.Name))
  const assigned = new Set<string>()
  return entries.map((entry) => {
    let name = entry.Name
    if (assigned.has(name)) {
      let suffix = 2
      while (reserved.has(`${entry.Name} (${suffix})`)) {
        suffix += 1
      }
      name = `${entry.Name} (${suffix})`
      reserved.add(name)
    }
    assigned.add(name)
    return {...entry, Name: name}
  })
}

/** 같은 모델의 VTube Studio 설정에만 등록된 표정을 model3.json 참조 뒤에 결합한다. */
export const readCubismExpressions = (
  archive: CubismArchive,
  modelPath: string,
  declared: unknown,
): ReadonlyArray<CubismExpressionReference> => {
  const explicit = jsonArray(declared ?? []).map((value) => {
    const entry = jsonObject(value)
    return {File: jsonString(entry.File), Name: jsonString(entry.Name)}
  })
  const settings = readVtubeSettings(archive, modelPath)
  if (settings === undefined) {
    return uniqueNames(explicit)
  }
  const known = new Set(explicit.map((entry) => resolveCubismAsset(modelPath, entry.File)))
  const imported = jsonArray(settings.Hotkeys ?? []).flatMap((value) => {
    const entry = jsonObject(value)
    if (entry.Action !== 'ToggleExpression' || entry.File === '') {
      return []
    }
    const file = resolveVtubeAsset(archive.entries, modelPath, jsonString(entry.File))
    const path = resolveCubismAsset(modelPath, file)
    if (known.has(path)) {
      return []
    }
    known.add(path)
    return [{File: file, Name: jsonString(entry.Name)}]
  })
  return uniqueNames([...explicit, ...imported])
}
