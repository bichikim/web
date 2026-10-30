import type {PuppetPart, PuppetSpatialSurface} from '../../player'
import {getSpatialTargetBounds} from './spatial-target-bounds'

export const createSpatialSurface = (part: PuppetPart): PuppetSpatialSurface => {
  const bounds = getSpatialTargetBounds([part], {height: NaN, width: NaN, x: NaN, y: NaN})
  const originX = bounds.x + bounds.width / 2
  const originY = bounds.y + bounds.height / 2
  return {
    controlPoints: part.mesh.vertices.flatMap((coordinate, index) =>
      index % 2 === 0 ? [coordinate, part.mesh.vertices[index + 1]!, 0] : [],
    ),
    groupId: part.id,
    origin: [originX, originY, 0],
  }
}
