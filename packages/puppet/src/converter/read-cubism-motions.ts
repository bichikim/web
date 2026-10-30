import {jsonArray, jsonObject, jsonString} from './json-fields'
import {type CubismArchive, resolveCubismAsset} from './read-cubism-archive'
import {readVtubeSettings} from './read-vtube-settings'
import {resolveVtubeAsset} from './resolve-vtube-asset'

/** model3의 모션 설정을 우선하고 같은 모델의 VTube 모션 참조를 보완한다. */
export const readCubismMotions = (
  archive: CubismArchive,
  modelPath: string,
  declared: unknown,
): Record<string, ReadonlyArray<unknown>> => {
  const groups = new Map(
    Object.entries(jsonObject(declared ?? {})).map(([group, entries]) => [
      group,
      jsonArray(entries),
    ]),
  )
  const settings = readVtubeSettings(archive, modelPath)
  if (settings === undefined) {
    return Object.fromEntries(groups)
  }
  const known = new Set(
    [...groups.values()].flatMap((entries) =>
      entries.map((entry) => resolveCubismAsset(modelPath, jsonString(jsonObject(entry).File))),
    ),
  )
  const references = jsonObject(settings.FileReferences)
  const candidates = [
    {File: references.IdleAnimation ?? '', Name: 'Idle'},
    {File: references.IdleAnimationWhenTrackingLost ?? '', Name: 'IdleTrackingLost'},
    ...jsonArray(settings.Hotkeys ?? []).flatMap((value) => {
      const entry = jsonObject(value)
      return entry.Action === 'ChangeIdleAnimation' || entry.Action === 'TriggerAnimation'
        ? [{File: entry.File, Name: jsonString(entry.Name)}]
        : []
    }),
  ]
  for (const candidate of candidates) {
    if (candidate.File !== '') {
      const reference = jsonString(candidate.File)
      const file = resolveVtubeAsset(archive.entries, modelPath, reference)
      const path = resolveCubismAsset(modelPath, file)
      if (!known.has(path)) {
        known.add(path)
        groups.set(candidate.Name, [...(groups.get(candidate.Name) ?? []), {File: file}])
      }
    }
  }
  return Object.fromEntries(groups)
}
