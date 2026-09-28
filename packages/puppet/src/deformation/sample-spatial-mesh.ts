import type {PuppetSpatialMesh} from '../player/document'

const COORDINATES = 3
const GRID_DIVISIONS = 32
const EPSILON = 0.000001

interface Triangle {
  readonly ax: number
  readonly ay: number
  readonly az: number
  readonly bx: number
  readonly by: number
  readonly bz: number
  readonly cx: number
  readonly cy: number
  readonly cz: number
  readonly denominator: number
}

const getTriangles = (mesh: PuppetSpatialMesh): Triangle[] =>
  Array.from({length: mesh.indices.length / COORDINATES}, (_, index) => {
    const first = mesh.indices[index * COORDINATES]! * COORDINATES
    const second = mesh.indices[index * COORDINATES + 1]! * COORDINATES
    const third = mesh.indices[index * COORDINATES + 2]! * COORDINATES
    const ax = mesh.vertices[first]!
    const ay = mesh.vertices[first + 1]!
    const bx = mesh.vertices[second]!
    const by = mesh.vertices[second + 1]!
    const cx = mesh.vertices[third]!
    const cy = mesh.vertices[third + 1]!
    return {
      ax,
      ay,
      az: mesh.vertices[first + 2]!,
      bx,
      by,
      bz: mesh.vertices[second + 2]!,
      cx,
      cy,
      cz: mesh.vertices[third + 2]!,
      denominator: (by - cy) * (ax - cx) + (cx - bx) * (ay - cy),
    }
  }).filter((triangle) => Math.abs(triangle.denominator) >= EPSILON)

const getBounds = (triangles: ReadonlyArray<Triangle>) =>
  triangles.reduce(
    (bounds, triangle) => ({
      maxX: Math.max(bounds.maxX, triangle.ax, triangle.bx, triangle.cx),
      maxY: Math.max(bounds.maxY, triangle.ay, triangle.by, triangle.cy),
      minX: Math.min(bounds.minX, triangle.ax, triangle.bx, triangle.cx),
      minY: Math.min(bounds.minY, triangle.ay, triangle.by, triangle.cy),
    }),
    {maxX: -Infinity, maxY: -Infinity, minX: Infinity, minY: Infinity},
  )

const getTriangleDepth = (triangle: Triangle, x: number, y: number): number | undefined => {
  const firstWeight =
    ((triangle.by - triangle.cy) * (x - triangle.cx) +
      (triangle.cx - triangle.bx) * (y - triangle.cy)) /
    triangle.denominator
  const secondWeight =
    ((triangle.cy - triangle.ay) * (x - triangle.cx) +
      (triangle.ax - triangle.cx) * (y - triangle.cy)) /
    triangle.denominator
  const thirdWeight = 1 - firstWeight - secondWeight
  return firstWeight >= -EPSILON && secondWeight >= -EPSILON && thirdWeight >= -EPSILON
    ? firstWeight * triangle.az + secondWeight * triangle.bz + thirdWeight * triangle.cz
    : undefined
}

/** Indexes projected triangles once so dense image meshes can sample nearby faces. */
export const createSpatialMeshDepthSampler = (mesh: PuppetSpatialMesh) => {
  const triangles = getTriangles(mesh)
  const bounds = getBounds(triangles)
  const xCell = (value: number) =>
    Math.max(
      0,
      Math.min(
        GRID_DIVISIONS - 1,
        Math.floor(((value - bounds.minX) / (bounds.maxX - bounds.minX || 1)) * GRID_DIVISIONS),
      ),
    )
  const yCell = (value: number) =>
    Math.max(
      0,
      Math.min(
        GRID_DIVISIONS - 1,
        Math.floor(((value - bounds.minY) / (bounds.maxY - bounds.minY || 1)) * GRID_DIVISIONS),
      ),
    )
  const cells: Triangle[][] = Array.from({length: GRID_DIVISIONS * GRID_DIVISIONS}, () => [])
  for (const triangle of triangles) {
    for (
      let y = yCell(Math.min(triangle.ay, triangle.by, triangle.cy));
      y <= yCell(Math.max(triangle.ay, triangle.by, triangle.cy));
      y += 1
    ) {
      for (
        let x = xCell(Math.min(triangle.ax, triangle.bx, triangle.cx));
        x <= xCell(Math.max(triangle.ax, triangle.bx, triangle.cx));
        x += 1
      ) {
        cells[y * GRID_DIVISIONS + x]!.push(triangle)
      }
    }
  }
  return (x: number, y: number): number => {
    if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) {
      return 0
    }
    let depth = Number.NEGATIVE_INFINITY
    for (const triangle of cells[yCell(y) * GRID_DIVISIONS + xCell(x)]!) {
      const next = getTriangleDepth(triangle, x, y)
      if (next !== undefined) {
        depth = Math.max(depth, next)
      }
    }
    return Number.isFinite(depth) ? depth : 0
  }
}
