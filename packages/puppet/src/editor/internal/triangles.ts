import type {MeshTriangleIndices} from '../../mesh'

export const replaceTriangleVertex = (
  triangle: MeshTriangleIndices,
  currentIndex: number,
  nextIndex: number,
): MeshTriangleIndices => {
  const replaceIndex = (index: number) => (index === currentIndex ? nextIndex : index)

  return [replaceIndex(triangle[0]), replaceIndex(triangle[1]), replaceIndex(triangle[2])]
}

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
