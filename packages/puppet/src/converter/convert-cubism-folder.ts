import {convertCubismArchive} from './convert-cubism-archive'
import type {ConvertCmo3Result} from './convert-cmo3'
import {
  createCubismArchive,
  MAXIMUM_ARCHIVE_BYTES,
  MAXIMUM_ENTRY_COUNT,
} from './read-cubism-archive'

/** 선택한 폴더의 상대 경로를 보존해 ZIP과 같은 모델 변환 경로로 전달한다. */
export const convertCubismFolder = async (
  files: ReadonlyArray<File>,
  signal?: AbortSignal,
): Promise<ConvertCmo3Result> => {
  signal?.throwIfAborted()
  if (
    files.length > MAXIMUM_ENTRY_COUNT ||
    files.some((file) => file.size > MAXIMUM_ARCHIVE_BYTES / 2) ||
    files.reduce((sum, file) => sum + file.size, 0) > MAXIMUM_ARCHIVE_BYTES
  ) {
    throw new Error('Cubism archive exceeds the supported size')
  }
  const entries = await Promise.all(
    files.map(async (file) => {
      const path = file.webkitRelativePath || file.name
      const bytes = await file.arrayBuffer()
      return [path, new Uint8Array(bytes)] as const
    }),
  )
  signal?.throwIfAborted()
  if (new Set(entries.map(([path]) => path)).size !== entries.length) {
    throw new Error('Cubism 폴더에 중복된 파일 경로가 있습니다.')
  }
  return convertCubismArchive(createCubismArchive(new Map(entries)))
}
