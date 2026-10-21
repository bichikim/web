import type {BackgroundRepository} from '@winter-love/wallpaper/model'

/** Imports nonempty photos and videos in selection order. */
export const addMediaFiles = async (
  repository: BackgroundRepository,
  files: readonly File[],
): Promise<void> => {
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
    await repository.add(file, kind)
  }
}
