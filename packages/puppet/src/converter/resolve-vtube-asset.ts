import {resolveCubismAsset} from './read-cubism-archive'

/** VTube의 파일명 참조는 같은 모델 폴더 아래에서만 찾고, 중복 파일명은 오류로 보고한다. */
export const resolveVtubeAsset = (
  entries: ReadonlyMap<string, Uint8Array>,
  modelPath: string,
  reference: string,
): string => {
  const direct = resolveCubismAsset(modelPath, reference)
  if (entries.has(direct) || /[/\\]/u.test(reference)) {
    return reference
  }
  const directory = modelPath.slice(0, modelPath.lastIndexOf('/') + 1)
  const matches = [...entries.keys()].filter(
    (path) => path.startsWith(directory) && path.endsWith(`/${reference}`),
  )
  if (matches.length > 1) {
    throw new Error(`VTube asset filename is ambiguous: ${reference}`)
  }
  return matches[0]?.slice(directory.length) ?? reference
}
