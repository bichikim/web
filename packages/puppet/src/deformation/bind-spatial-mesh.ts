import type {PuppetPart, PuppetSpatialAttachment, PuppetSpatialMesh} from '../player/document'

const COORDINATES = 3
const DIVISIONS = 32
const EPSILON = 0.000001
const placedMeshes = new WeakMap<
  PuppetSpatialMesh,
  {readonly position: readonly [number, number, number]; readonly mesh: PuppetSpatialMesh}
>()

interface ProjectedTriangle {
  readonly index: number
  readonly points: readonly [number, number, number, number, number, number]
  readonly denominator: number
}

export interface SpatialMeshSample {
  readonly attachment: PuppetSpatialAttachment
  readonly point: readonly [number, number, number]
}

/** Places a control mesh in document coordinates without changing its authored geometry. */
export const placeSpatialMesh = (
  mesh: PuppetSpatialMesh,
  position: readonly [number, number, number] | undefined,
): PuppetSpatialMesh => {
  if (position === undefined || position.every((coordinate) => coordinate === 0)) {
    return mesh
  }
  const cached = placedMeshes.get(mesh)
  if (
    cached !== undefined &&
    cached.position.every((coordinate, index) => coordinate === position[index])
  ) {
    return cached.mesh
  }
  const placed = {
    ...mesh,
    vertices: mesh.vertices.map((coordinate, index) => coordinate + position[index % COORDINATES]!),
  }
  placedMeshes.set(mesh, {mesh: placed, position: [...position]})
  return placed
}

const getPoint = (
  mesh: PuppetSpatialMesh,
  vertexIndex: number,
): readonly [number, number, number] => {
  const offset = vertexIndex * COORDINATES
  return [mesh.vertices[offset]!, mesh.vertices[offset + 1]!, mesh.vertices[offset + 2]!]
}

const getTriangle = (mesh: PuppetSpatialMesh, index: number): ProjectedTriangle => {
  const first = getPoint(mesh, mesh.indices[index * COORDINATES]!)
  const second = getPoint(mesh, mesh.indices[index * COORDINATES + 1]!)
  const third = getPoint(mesh, mesh.indices[index * COORDINATES + 2]!)
  const points = [first[0], first[1], second[0], second[1], third[0], third[1]] as const
  return {
    denominator:
      (second[1] - third[1]) * (first[0] - third[0]) +
      (third[0] - second[0]) * (first[1] - third[1]),
    index,
    points,
  }
}

const getWeights = (
  triangle: ProjectedTriangle,
  x: number,
  y: number,
): readonly [number, number, number] => {
  const [ax, ay, bx, by, cx, cy] = triangle.points
  const first = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / triangle.denominator
  const second = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / triangle.denominator
  return [first, second, 1 - first - second]
}

export const resolveSpatialMeshAttachment = (
  mesh: PuppetSpatialMesh,
  attachment: PuppetSpatialAttachment,
): readonly [number, number, number] | undefined => {
  const indices = mesh.indices.slice(
    attachment.triangleIndex * COORDINATES,
    (attachment.triangleIndex + 1) * COORDINATES,
  )
  if (indices.length !== COORDINATES || indices.some((index) => index === undefined)) {
    return undefined
  }
  const points = indices.map((index) => getPoint(mesh, index))
  return [0, 1, 2].map((axis) =>
    points.reduce(
      (sum, point, index) => sum + point[axis]! * attachment.weights[index]!,
      attachment.offset[axis],
    ),
  ) as [number, number, number]
}

const nearestEdgeWeights = (
  triangle: ProjectedTriangle,
  x: number,
  y: number,
): readonly [number, number, number] => {
  const {points} = triangle
  const candidates = [0, 1, 2].map((first) => {
    const second = (first + 1) % COORDINATES
    const ax = points[first * 2]!
    const ay = points[first * 2 + 1]!
    const dx = points[second * 2]! - ax
    const dy = points[second * 2 + 1]! - ay
    const length = dx * dx + dy * dy
    const fraction =
      length === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length))
    const weights: [number, number, number] = [0, 0, 0]
    weights[first] = 1 - fraction
    weights[second] = fraction
    return {distance: (x - ax - dx * fraction) ** 2 + (y - ay - dy * fraction) ** 2, weights}
  })
  return candidates.reduce((nearest, candidate) =>
    candidate.distance < nearest.distance ? candidate : nearest,
  ).weights
}

interface SampleTriangleOptions {
  readonly mesh: PuppetSpatialMesh
  readonly triangle: ProjectedTriangle
  readonly weights: readonly [number, number, number]
  readonly x: number
  readonly y: number
}

const sampleTriangle = (options: SampleTriangleOptions): SpatialMeshSample => {
  const attachment: PuppetSpatialAttachment = {
    offset: [0, 0, 0],
    triangleIndex: options.triangle.index,
    weights: options.weights,
  }
  const point = resolveSpatialMeshAttachment(options.mesh, attachment)!
  const offset: [number, number, number] = [options.x - point[0], options.y - point[1], 0]
  return {attachment: {...attachment, offset}, point: [options.x, options.y, point[2]]}
}

/** Indexes the visible XY projection and links image points to its frontmost triangles. */
export const createSpatialMeshAttachmentSampler = (
  mesh: PuppetSpatialMesh,
  options?: {readonly outside?: 'nearest' | 'none'},
) => {
  const triangles = Array.from({length: mesh.indices.length / COORDINATES}, (_, index) =>
    getTriangle(mesh, index),
  ).filter((triangle) => Math.abs(triangle.denominator) >= EPSILON)
  if (triangles.length === 0) {
    return (_x: number, _y: number): SpatialMeshSample | undefined => undefined
  }
  const bounds = triangles.reduce(
    (range, triangle) => {
      const [ax, ay, bx, by, cx, cy] = triangle.points
      return {
        maxX: Math.max(range.maxX, ax, bx, cx),
        maxY: Math.max(range.maxY, ay, by, cy),
        minX: Math.min(range.minX, ax, bx, cx),
        minY: Math.min(range.minY, ay, by, cy),
      }
    },
    {maxX: -Infinity, maxY: -Infinity, minX: Infinity, minY: Infinity},
  )
  const xCell = (value: number) =>
    Math.max(
      0,
      Math.min(
        DIVISIONS - 1,
        Math.floor(((value - bounds.minX) / (bounds.maxX - bounds.minX || 1)) * DIVISIONS),
      ),
    )
  const yCell = (value: number) =>
    Math.max(
      0,
      Math.min(
        DIVISIONS - 1,
        Math.floor(((value - bounds.minY) / (bounds.maxY - bounds.minY || 1)) * DIVISIONS),
      ),
    )
  const cells: ProjectedTriangle[][] = Array.from({length: DIVISIONS * DIVISIONS}, () => [])
  for (const triangle of triangles) {
    const [ax, ay, bx, by, cx, cy] = triangle.points
    for (let row = yCell(Math.min(ay, by, cy)); row <= yCell(Math.max(ay, by, cy)); row += 1) {
      for (
        let column = xCell(Math.min(ax, bx, cx));
        column <= xCell(Math.max(ax, bx, cx));
        column += 1
      ) {
        cells[row * DIVISIONS + column]!.push(triangle)
      }
    }
  }
  return (x: number, y: number): SpatialMeshSample | undefined => {
    let front: SpatialMeshSample | undefined
    for (const triangle of cells[yCell(y) * DIVISIONS + xCell(x)]!) {
      const weights = getWeights(triangle, x, y)
      if (weights.every((weight) => weight >= -EPSILON)) {
        const sample = sampleTriangle({mesh, triangle, weights, x, y})
        if (front === undefined || sample.point[2] > front.point[2]) {
          front = sample
        }
      }
    }
    if (front !== undefined) {
      return front
    }
    if (options?.outside === 'none') {
      return undefined
    }
    let nearest: {distance: number; sample: SpatialMeshSample} | undefined
    for (const triangle of triangles) {
      const weights = nearestEdgeWeights(triangle, x, y)
      const sample = sampleTriangle({mesh, triangle, weights, x, y})
      const [ax, ay, bx, by, cx, cy] = triangle.points
      const surfaceX = ax * weights[0] + bx * weights[1] + cx * weights[2]
      const surfaceY = ay * weights[0] + by * weights[1] + cy * weights[2]
      const distance = (x - surfaceX) ** 2 + (y - surfaceY) ** 2
      const distanceTolerance =
        nearest === undefined ? 0 : EPSILON * Math.max(1, distance, nearest.distance)
      if (
        nearest === undefined ||
        distance < nearest.distance - distanceTolerance ||
        (Math.abs(distance - nearest.distance) <= distanceTolerance &&
          sample.point[2] > nearest.sample.point[2])
      ) {
        nearest = {distance, sample}
      }
    }
    return nearest?.sample
  }
}

const attachmentSamplers = new WeakMap<
  PuppetSpatialMesh,
  ReturnType<typeof createSpatialMeshAttachmentSampler>
>()

/** Reuses the triangle index while the same authored mesh is sampled across edits and frames. */
export const getSpatialMeshAttachmentSampler = (mesh: PuppetSpatialMesh) => {
  const cached = attachmentSamplers.get(mesh)
  if (cached !== undefined) {
    return cached
  }
  const sampler = createSpatialMeshAttachmentSampler(mesh)
  attachmentSamplers.set(mesh, sampler)
  return sampler
}

/** Attaches every image vertex to the frontmost projected mesh surface. */
export const bindSpatialPartToMesh = (
  part: PuppetPart,
  mesh: PuppetSpatialMesh,
  position: readonly [number, number, number] = [0, 0, 0],
): PuppetPart | undefined => {
  if (part.spatial === undefined) {
    return undefined
  }
  const sample = getSpatialMeshAttachmentSampler(mesh)
  const samples = part.mesh.vertices.flatMap((x, index, vertices) => {
    if (index % 2 !== 0) {
      return []
    }
    const y = vertices[index + 1]!
    const result = sample(x - position[0], y - position[1])
    return result === undefined
      ? [undefined]
      : [{...result, point: [x, y, result.point[2] + position[2]] as const}]
  })
  if (samples.some((result) => result === undefined)) {
    return undefined
  }
  return {
    ...part,
    spatial: {
      ...part.spatial,
      attachments: samples.map((result) => result!.attachment),
      controlPoints: samples.flatMap((result) => result!.point),
    },
  }
}
