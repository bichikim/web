import {jsonArray, jsonObject, jsonString} from './json-fields'
import {resolveCubismAsset} from './read-cubism-archive'

interface MissingAssetsOptions {
  readonly editorSource?: boolean
  readonly requiredOnly?: boolean
}

/** 선택된 변환 경로가 읽을 파일 중 없는 참조를 용도와 상대 경로로 모은다. */
export const findMissingCubismAssets = (
  entries: ReadonlyMap<string, Uint8Array>,
  modelPath: string,
  references: Record<string, unknown>,
  options: MissingAssetsOptions = {},
): ReadonlyArray<string> => {
  const missing: string[] = []
  const check = (purpose: string, reference: unknown) => {
    const path = resolveCubismAsset(modelPath, jsonString(reference))
    if (!entries.has(path)) {
      missing.push(`${purpose}: ${path}`)
    }
  }
  if (options.editorSource !== true) {
    if (references.Moc === undefined) {
      missing.push('모델 데이터 (.moc3): model3.json의 FileReferences.Moc 항목')
    } else {
      check('모델 데이터 (.moc3)', references.Moc)
    }
    if (references.Textures === undefined) {
      missing.push('PNG 텍스처: model3.json의 FileReferences.Textures 목록')
    } else {
      jsonArray(references.Textures).forEach((reference) => check('PNG 텍스처', reference))
    }
  }
  if (options.requiredOnly === true) {
    return [...new Set(missing)]
  }
  for (const [key, purpose] of [
    ['Physics', '물리 설정'],
    ['Pose', '포즈 설정'],
    ['DisplayInfo', '표시 이름'],
    ['UserData', '사용자 데이터'],
  ] as const) {
    const reference = references[key]
    if (reference !== undefined) {
      check(purpose, reference)
    }
  }
  for (const expression of jsonArray(references.Expressions ?? [])) {
    check('표정', jsonObject(expression).File)
  }
  const motions = jsonObject(references.Motions ?? {})
  for (const group of Object.values(motions)) {
    for (const motion of jsonArray(group)) {
      const entry = jsonObject(motion)
      check('모션', entry.File)
      if (entry.Sound !== undefined) {
        check('모션 오디오', entry.Sound)
      }
    }
  }
  return [...new Set(missing)]
}
