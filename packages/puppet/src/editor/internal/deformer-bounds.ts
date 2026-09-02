import type {PuppetDocument} from '../../player'

export const getDeformerBounds = (document: PuppetDocument, partIds: ReadonlyArray<string>) => {
  const selectedIds = new Set(partIds)
  const coordinates = document.parts
    .filter((part) => selectedIds.has(part.id))
    .flatMap((part) => part.mesh.vertices)
  const horizontal = coordinates.filter((_, index) => index % 2 === 0)
  const vertical = coordinates.filter((_, index) => index % 2 === 1)

  if (horizontal.length === 0 || vertical.length === 0) {
    return undefined
  }

  const minimumX = Math.min(...horizontal)
  const maximumX = Math.max(...horizontal)
  const minimumY = Math.min(...vertical)
  const maximumY = Math.max(...vertical)

  return {
    height: Math.max(1, maximumY - minimumY),
    width: Math.max(1, maximumX - minimumX),
    x: minimumX,
    y: minimumY,
  }
}
