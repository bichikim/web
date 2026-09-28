import type {PuppetSpatialMesh} from '../player/document'
import {createSpatialMeshAttachmentSampler} from './bind-spatial-mesh'

const COORDINATES = 3
const MIN_DIVISIONS = 2

/** Samples a continuous front surface for dense imported mesh editor previews. */
export const createSpatialMeshFrontPreview = (
  mesh: PuppetSpatialMesh,
  divisions: number,
): PuppetSpatialMesh | undefined => {
  if (!Number.isInteger(divisions) || divisions < MIN_DIVISIONS || mesh.vertices.length === 0) {
    return undefined
  }
  const bounds = mesh.vertices.reduce(
    (range, coordinate, index) => {
      switch (index % COORDINATES) {
        case 0:
          return {
            ...range,
            maxX: Math.max(range.maxX, coordinate),
            minX: Math.min(range.minX, coordinate),
          }
        case 1:
          return {
            ...range,
            maxY: Math.max(range.maxY, coordinate),
            minY: Math.min(range.minY, coordinate),
          }
        default:
          return range
      }
    },
    {maxX: -Infinity, maxY: -Infinity, minX: Infinity, minY: Infinity},
  )
  const sample = createSpatialMeshAttachmentSampler(mesh, {outside: 'none'})
  const width = divisions + 1
  const points = Array.from({length: width * width}, (_, index) => {
    const column = index % width
    const row = Math.floor(index / width)
    const x = bounds.minX + ((bounds.maxX - bounds.minX) * column) / divisions
    const y = bounds.minY + ((bounds.maxY - bounds.minY) * row) / divisions
    return sample(x, y)?.point
  })
  const indices: number[] = []
  for (let row = 0; row < divisions; row += 1) {
    for (let column = 0; column < divisions; column += 1) {
      const first = row * width + column
      const second = first + 1
      const third = first + width
      const fourth = third + 1
      if ([first, second, third, fourth].every((index) => points[index] !== undefined)) {
        indices.push(first, second, third, second, fourth, third)
      }
    }
  }
  return indices.length === 0
    ? undefined
    : {
        indices,
        source: {kind: 'imported', name: 'front preview'},
        vertices: points.flatMap((point) => point ?? [0, 0, 0]),
      }
}
