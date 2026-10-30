import type {PuppetDocument} from '../../player'
import {getSpatialTargetBounds} from './spatial-target-bounds'

export const getDeformerBounds = (document: PuppetDocument, partIds: ReadonlyArray<string>) => {
  const selectedIds = new Set(partIds)
  const bounds = getSpatialTargetBounds(
    document.parts.filter((part) => selectedIds.has(part.id)),
    {height: 0, width: 0, x: Infinity, y: Infinity},
  )

  if (!Number.isFinite(bounds.x)) {
    return undefined
  }

  return {
    ...bounds,
    height: Math.max(1, bounds.height),
    width: Math.max(1, bounds.width),
  }
}
