import {jsonArray, jsonObject, jsonString} from './json-fields'
import {resolveCubismAsset} from './read-cubism-archive'

/** 없는 선택 파일의 참조만 제거한다. 모션 오디오 누락은 모션 자체를 제거하지 않는다. */
export const filterCubismReferences = (
  entries: ReadonlyMap<string, Uint8Array>,
  modelPath: string,
  references: Record<string, unknown>,
): Record<string, unknown> => {
  const optionalKeys = new Set(['Physics', 'Pose', 'DisplayInfo', 'UserData'])
  const exists = (reference: unknown) =>
    entries.has(resolveCubismAsset(modelPath, jsonString(reference)))
  const metadata = Object.fromEntries(
    Object.entries(references).filter(
      ([key, reference]) => !optionalKeys.has(key) || exists(reference),
    ),
  )
  const expressions = jsonArray(references.Expressions ?? []).filter((value) =>
    exists(jsonObject(value).File),
  )
  const motions = Object.fromEntries(
    Object.entries(jsonObject(references.Motions ?? {})).map(([group, values]) => [
      group,
      jsonArray(values).flatMap((value) => {
        const motion = jsonObject(value)
        if (!exists(motion.File)) {
          return []
        }
        const {Sound, ...silent} = motion
        return [Sound !== undefined && exists(Sound) ? motion : silent]
      }),
    ]),
  )
  return {...metadata, Expressions: expressions, Motions: motions}
}
