import type {PuppetMesh} from '../../player/document'

const TOLERANCE = 1e-6

/** Checks whether moving vertices can preserve the complete texture with unchanged triangles. */
export const hasAffineUv = (mesh: PuppetMesh): boolean => {
  const [first, second, third] = mesh.indices
  if (first === undefined || second === undefined || third === undefined) {
    return false
  }
  const point = (index: number) => ({
    x: mesh.vertices[index * 2]!,
    y: mesh.vertices[index * 2 + 1]!,
  })
  const origin = point(first)
  const next = point(second)
  const last = point(third)
  const horizontal = next.x - origin.x
  const vertical = next.y - origin.y
  const across = last.x - origin.x
  const down = last.y - origin.y
  const divisor = horizontal * down - vertical * across
  if (Math.abs(divisor) < TOLERANCE) {
    return false
  }
  return mesh.vertices.every((_, offset) => {
    if (offset % 2 !== 0) {
      return true
    }
    const x = mesh.vertices[offset]! - origin.x
    const y = mesh.vertices[offset + 1]! - origin.y
    const weight = (x * down - y * across) / divisor
    const other = (horizontal * y - vertical * x) / divisor
    return [0, 1].every(
      (axis) =>
        Math.abs(
          mesh.uvs[offset + axis]! -
            ((1 - weight - other) * mesh.uvs[first * 2 + axis]! +
              weight * mesh.uvs[second * 2 + axis]! +
              other * mesh.uvs[third * 2 + axis]!),
        ) < TOLERANCE,
    )
  })
}
