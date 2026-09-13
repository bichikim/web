export const isPsdSource = (value: unknown): boolean => {
  if (value === undefined) {
    return true
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const source = value as Record<string, unknown>
  return (
    [source.documentId, source.fileName].every(
      (value) => value === undefined || (typeof value === 'string' && value.length > 0),
    ) &&
    Array.isArray(source.path) &&
    source.path.length > 0 &&
    source.path.every((part) => typeof part === 'string' && part.length > 0) &&
    [source.x, source.y].every((value) => typeof value === 'number' && Number.isFinite(value)) &&
    [source.width, source.height].every(
      (value) => typeof value === 'number' && Number.isInteger(value) && value > 0,
    ) &&
    (source.layerId === undefined ||
      (typeof source.layerId === 'number' &&
        Number.isInteger(source.layerId) &&
        source.layerId >= 0))
  )
}
