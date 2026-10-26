import type {MediaImportRepository} from '@winter-love/wallpaper/model'

/** Imports nonempty photos and videos in selection order, returning new or reused media IDs. */
export const addMediaFiles = async (
  repository: MediaImportRepository,
  files: readonly File[],
): Promise<readonly string[]> => {
  const ids: string[] = []
  for (const file of files) {
    const kind = file.type.startsWith('image/')
      ? 'photo'
      : file.type.startsWith('video/')
        ? 'video'
        : null
    if (kind === null || file.size === 0) {
      throw new Error('사진이나 동영상 파일을 선택해 주세요.')
    }
    // Each file is committed before inspecting the next to limit concurrent byte reads.
    // eslint-disable-next-line no-await-in-loop
    ids.push(await repository.importMedia(file, kind))
  }
  return ids
}
