import type {MeshTriangleIndices} from '../../mesh'

export const deduplicateTriangles = (triangles: ReadonlyArray<MeshTriangleIndices>) => {
  const uniqueTriangles = new Map<string, MeshTriangleIndices>()

  for (const triangle of triangles) {
    const key = [...triangle].sort((first, second) => first - second).join(':')

    if (!uniqueTriangles.has(key)) {
      uniqueTriangles.set(key, triangle)
    }
  }

  return [...uniqueTriangles.values()]
}
