/** Revokes the previous URL before obtaining the next Blob; null clears without creating a URL. */
export const replaceBlobObjectUrl = (
  previous: string | null,
  getNext: () => Blob | null,
): string | null => {
  if (previous !== null) {
    URL.revokeObjectURL(previous)
  }
  const next = getNext()
  return next === null ? null : URL.createObjectURL(next)
}
