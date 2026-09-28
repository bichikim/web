import type {PuppetPart, PuppetSpatialSurface} from '../../player'

export const createSpatialSurface = (part: PuppetPart): PuppetSpatialSurface => {
  const horizontal = part.mesh.vertices.filter((_, index) => index % 2 === 0)
  const vertical = part.mesh.vertices.filter((_, index) => index % 2 === 1)
  const originX = (Math.min(...horizontal) + Math.max(...horizontal)) / 2
  const originY = (Math.min(...vertical) + Math.max(...vertical)) / 2
  return {
    controlPoints: part.mesh.vertices.flatMap((coordinate, index) =>
      index % 2 === 0 ? [coordinate, part.mesh.vertices[index + 1]!, 0] : [],
    ),
    groupId: part.id,
    origin: [originX, originY, 0],
    rotationParameterIds: [null, null, null],
  }
}
