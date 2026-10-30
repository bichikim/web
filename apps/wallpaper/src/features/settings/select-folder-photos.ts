/** Selects nonempty photos in picker order; null includes every depth and zero only the root. */
export const selectFolderPhotos = (
  files: readonly File[],
  maxDepth: number | null = null,
): readonly File[] => {
  if (maxDepth !== null && (!Number.isInteger(maxDepth) || maxDepth < 0)) {
    throw new RangeError('Maximum folder depth must be a nonnegative integer or null')
  }
  return files.filter((file) => {
    if (!file.type.startsWith('image/') || file.size === 0) {
      return false
    }
    const depth = file.webkitRelativePath.split('/').length - 2
    return depth >= 0 && (maxDepth === null || depth <= maxDepth)
  })
}
