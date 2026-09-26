import type {
  PuppetSpatialMesh,
  PuppetSpatialObject,
  PuppetSpatialPrimitive,
  PuppetSpatialPrimitiveObject,
} from '../player/document'

type Point3 = readonly [number, number, number]
type DistanceField = (point: Point3) => number

interface GenerateSpatialMeshOptions {
  readonly operations?: ReadonlyArray<PuppetSpatialPrimitive>
  readonly objects?: ReadonlyArray<PuppetSpatialObject>
  readonly resolution?: number
}

const HALF = 0.5
const COORDINATES = 3
const PADDING_RATIO = 0.1
const DEFAULT_RESOLUTION = 16
const MIN_RESOLUTION = 4
const MAX_RESOLUTION = 32
const DEGREES_PER_HALF_ROTATION = 180
/* eslint-disable no-magic-numbers -- Cube corner and edge lookup indices. */
const CUBE_CORNERS = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
] as const
const CUBE_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const
const BOX_CORNERS = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
] as const
const BOX_INDICES = [
  0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6,
  1, 6, 5,
] as const
/* eslint-enable no-magic-numbers */

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value))

const createBoxVertices = (
  primitive: PuppetSpatialPrimitive | PuppetSpatialPrimitiveObject,
): ReadonlyArray<number> => {
  const [angleX, angleY, angleZ] = ('rotation' in primitive ? primitive.rotation : [0, 0, 0]).map(
    (angle) => (angle * Math.PI) / DEGREES_PER_HALF_ROTATION,
  )
  return BOX_CORNERS.flatMap((corner) => {
    const x = corner[0] * primitive.size[0] * HALF
    const y = corner[1] * primitive.size[1] * HALF
    const z = corner[2] * primitive.size[2] * HALF
    const pitchedY = y * Math.cos(angleX!) - z * Math.sin(angleX!)
    const pitchedZ = y * Math.sin(angleX!) + z * Math.cos(angleX!)
    const turnedX = x * Math.cos(angleY!) + pitchedZ * Math.sin(angleY!)
    const turnedZ = -x * Math.sin(angleY!) + pitchedZ * Math.cos(angleY!)
    return [
      primitive.center[0] + turnedX * Math.cos(angleZ!) - pitchedY * Math.sin(angleZ!),
      primitive.center[1] + turnedX * Math.sin(angleZ!) + pitchedY * Math.cos(angleZ!),
      primitive.center[2] + turnedZ,
    ]
  })
}

const compilePrimitiveDistance = (
  primitive: PuppetSpatialPrimitive | PuppetSpatialPrimitiveObject,
): DistanceField => {
  const [angleX, angleY, angleZ] = ('rotation' in primitive ? primitive.rotation : [0, 0, 0]).map(
    (angle) => (angle * Math.PI) / DEGREES_PER_HALF_ROTATION,
  )
  const cosineX = Math.cos(angleX!)
  const sineX = Math.sin(angleX!)
  const cosineY = Math.cos(angleY!)
  const sineY = Math.sin(angleY!)
  const cosineZ = Math.cos(angleZ!)
  const sineZ = Math.sin(angleZ!)
  const [width, height, depth] = primitive.size
  return (point) => {
    const localX = point[0] - primitive.center[0]
    const localY = point[1] - primitive.center[1]
    const localZ = point[2] - primitive.center[2]
    const turnedX = localX * cosineZ + localY * sineZ
    const turnedY = -localX * sineZ + localY * cosineZ
    const x = turnedX * cosineY - localZ * sineY
    const turnedZ = turnedX * sineY + localZ * cosineY
    const y = turnedY * cosineX + turnedZ * sineX
    const z = -turnedY * sineX + turnedZ * cosineX
    if (primitive.shape === 'sphere') {
      const radius = Math.min(width, height, depth) * HALF
      return (Math.hypot(x / width, y / height, z / depth) - HALF) * radius * 2
    }
    if (primitive.shape === 'cylinder') {
      const radial = (Math.hypot(x / width, y / height) - HALF) * Math.min(width, height)
      const vertical = Math.abs(z) - depth * HALF
      return (
        Math.hypot(Math.max(radial, 0), Math.max(vertical, 0)) +
        Math.min(Math.max(radial, vertical), 0)
      )
    }
    if (primitive.shape === 'prism') {
      const horizontal = Math.abs(x) / width
      const vertical = y / height
      const side = Math.max(-vertical - HALF, vertical + horizontal * 2 - HALF)
      const depthOutside = Math.abs(z) - depth * HALF
      return Math.max(side * Math.min(width, height), depthOutside)
    }
    const xOutside = Math.abs(x) - width * HALF
    const yOutside = Math.abs(y) - height * HALF
    const zOutside = Math.abs(z) - depth * HALF
    return (
      Math.hypot(Math.max(xOutside, 0), Math.max(yOutside, 0), Math.max(zOutside, 0)) +
      Math.min(Math.max(xOutside, yOutside, zOutside), 0)
    )
  }
}

const combineDistance = (
  distance: number,
  next: number,
  mode: PuppetSpatialPrimitive['mode'],
  smoothness = 0,
) => {
  switch (mode) {
    case 'add':
      return Math.min(distance, next)
    case 'intersect':
      return Math.max(distance, next)
    case 'subtract':
      return Math.max(distance, -next)
    case 'smooth-add': {
      if (smoothness <= 0) {
        return Math.min(distance, next)
      }
      const mix = clamp(HALF + (HALF * (next - distance)) / smoothness, 0, 1)
      return next * (1 - mix) + distance * mix - smoothness * mix * (1 - mix)
    }
  }
}

const compileObjectDistance = (object: PuppetSpatialObject): DistanceField => {
  if (!object.visible) {
    return () => Number.POSITIVE_INFINITY
  }
  if (object.kind === 'primitive') {
    return compilePrimitiveDistance(object)
  }
  const children = object.children
    .filter((child) => child.visible)
    .map((child) => ({
      distance: compileObjectDistance(child),
      mode: child.mode,
      smoothness: child.smoothness,
    }))
  return (point) =>
    children.reduce((distance, child, index) => {
      const next = child.distance(point)
      return index === 0 ? next : combineDistance(distance, next, child.mode, child.smoothness)
    }, Number.POSITIVE_INFINITY)
}

const compileFieldDistance = (operations: ReadonlyArray<PuppetSpatialPrimitive>): DistanceField => {
  const fields = operations.map((primitive) => ({
    distance: compilePrimitiveDistance(primitive),
    mode: primitive.mode,
    smoothness: primitive.smoothness,
  }))
  return (point) =>
    fields.reduce((distance, field, index) => {
      const next = field.distance(point)
      if (index === 0) {
        return next
      }
      return combineDistance(distance, next, field.mode, field.smoothness)
    }, Number.POSITIVE_INFINITY)
}

const collectPrimitives = (objects: ReadonlyArray<PuppetSpatialObject>): PuppetSpatialPrimitive[] =>
  objects.flatMap((object) => {
    if (!object.visible) {
      return []
    }
    if (object.kind === 'group') {
      return collectPrimitives(object.children)
    }
    return [
      {
        center: object.center,
        id: object.id,
        mode: object.mode,
        rotation: object.rotation,
        shape: object.shape,
        size: object.size,
        smoothness: object.smoothness,
      },
    ]
  })

const getBounds = (operations: ReadonlyArray<PuppetSpatialPrimitive>) => {
  const solids = operations.filter(
    (primitive) => primitive.mode === 'add' || primitive.mode === 'smooth-add',
  )
  const primitives = solids.length > 0 ? solids : operations
  const minimum: [number, number, number] = [Infinity, Infinity, Infinity]
  const maximum: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const primitive of primitives) {
    for (const axis of [0, 1, 2] as const) {
      const radius =
        'rotation' in primitive &&
        Array.isArray(primitive.rotation) &&
        primitive.rotation.some((angle) => angle !== 0)
          ? Math.hypot(...primitive.size) * HALF
          : primitive.size[axis] * HALF
      minimum[axis] = Math.min(minimum[axis], primitive.center[axis] - radius)
      maximum[axis] = Math.max(maximum[axis], primitive.center[axis] + radius)
    }
  }
  const padding = Math.max(...maximum.map((value, axis) => value - minimum[axis]!)) * PADDING_RATIO
  return {
    maximum: [maximum[0] + padding, maximum[1] + padding, maximum[2] + padding] as Point3,
    minimum: [minimum[0] - padding, minimum[1] - padding, minimum[2] - padding] as Point3,
  }
}

const getGridIndex = (x: number, y: number, z: number, edge: number) => x + edge * (y + edge * z)

interface Grid {
  readonly coordinates: ReadonlyArray<Point3>
  readonly distances: ReadonlyArray<number>
  readonly edge: number
}

const createGrid = (options: {
  readonly operations: ReadonlyArray<PuppetSpatialPrimitive>
  readonly resolution: number
  readonly distance: (point: Point3) => number
}): Grid => {
  const {minimum, maximum} = getBounds(options.operations)
  const edge = options.resolution + 1
  const coordinates: Point3[] = []
  const distances: number[] = []
  for (let z = 0; z < edge; z += 1) {
    for (let y = 0; y < edge; y += 1) {
      for (let x = 0; x < edge; x += 1) {
        const point: Point3 = [
          minimum[0] + ((maximum[0] - minimum[0]) * x) / options.resolution,
          minimum[1] + ((maximum[1] - minimum[1]) * y) / options.resolution,
          minimum[2] + ((maximum[2] - minimum[2]) * z) / options.resolution,
        ]
        coordinates.push(point)
        distances.push(options.distance(point))
      }
    }
  }
  return {coordinates, distances, edge}
}

interface MeshBuilder {
  readonly indices: number[]
  readonly vertices: number[]
}

const getCellIndex = (x: number, y: number, z: number, resolution: number) =>
  x + resolution * (y + resolution * z)

const addCellVertex = (
  builder: MeshBuilder,
  grid: Grid,
  corners: ReadonlyArray<number>,
): number => {
  const crossings = CUBE_EDGES.flatMap(([first, second]) => {
    const firstIndex = corners[first]!
    const secondIndex = corners[second]!
    const firstDistance = grid.distances[firstIndex]!
    const secondDistance = grid.distances[secondIndex]!
    if (firstDistance < 0 === secondDistance < 0) {
      return []
    }
    const fraction = firstDistance / (firstDistance - secondDistance)
    const firstPoint = grid.coordinates[firstIndex]!
    const secondPoint = grid.coordinates[secondIndex]!
    return [firstPoint.map((value, axis) => value + (secondPoint[axis]! - value) * fraction)]
  })
  if (crossings.length === 0) {
    return -1
  }
  const index = builder.vertices.length / COORDINATES
  builder.vertices.push(
    ...[0, 1, 2].map(
      (axis) => crossings.reduce((sum, point) => sum + point[axis]!, 0) / crossings.length,
    ),
  )
  return index
}

const diagonalLength = (vertices: ReadonlyArray<number>, first: number, second: number) =>
  [0, 1, 2].reduce(
    (sum, axis) =>
      sum + (vertices[first * COORDINATES + axis]! - vertices[second * COORDINATES + axis]!) ** 2,
    0,
  )

const addSurfaceQuad = (options: {
  readonly builder: MeshBuilder
  readonly cells: ReadonlyArray<number>
  readonly resolution: number
  readonly corners: ReadonlyArray<readonly [number, number, number]>
  readonly firstInside: boolean
}) => {
  const {builder, cells, resolution, corners, firstInside} = options
  const [firstVertex, secondVertex, thirdVertex, fourthVertex] = corners.map(
    ([x, y, z]) => cells[getCellIndex(x, y, z, resolution)]!,
  )
  if ([firstVertex, secondVertex, thirdVertex, fourthVertex].some((index) => index < 0)) {
    return
  }
  const triangles =
    diagonalLength(builder.vertices, firstVertex!, thirdVertex!) <=
    diagonalLength(builder.vertices, secondVertex!, fourthVertex!)
      ? [firstVertex!, secondVertex!, thirdVertex!, firstVertex!, thirdVertex!, fourthVertex!]
      : [firstVertex!, secondVertex!, fourthVertex!, secondVertex!, thirdVertex!, fourthVertex!]
  for (let index = 0; index < triangles.length; index += COORDINATES) {
    const [first, second, third] = triangles.slice(index, index + COORDINATES)
    builder.indices.push(first!, firstInside ? second! : third!, firstInside ? third! : second!)
  }
}

const createSurfaceNet = (grid: Grid, resolution: number): MeshBuilder => {
  const builder: MeshBuilder = {indices: [], vertices: []}
  const cells = Array.from({length: resolution ** COORDINATES}, () => -1)
  for (let z = 0; z < resolution; z += 1) {
    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const corners = CUBE_CORNERS.map(([dx, dy, dz]) =>
          getGridIndex(x + dx, y + dy, z + dz, grid.edge),
        )
        cells[getCellIndex(x, y, z, resolution)] = addCellVertex(builder, grid, corners)
      }
    }
  }
  for (let z = 1; z < resolution; z += 1) {
    for (let y = 1; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const first = getGridIndex(x, y, z, grid.edge)
        const second = getGridIndex(x + 1, y, z, grid.edge)
        const firstInside = grid.distances[first]! < 0
        if (firstInside !== grid.distances[second]! < 0) {
          addSurfaceQuad({
            builder,
            cells,
            corners: [
              [x, y - 1, z - 1],
              [x, y, z - 1],
              [x, y, z],
              [x, y - 1, z],
            ],
            firstInside,
            resolution,
          })
        }
      }
    }
  }
  for (let z = 1; z < resolution; z += 1) {
    for (let y = 0; y < resolution; y += 1) {
      for (let x = 1; x < resolution; x += 1) {
        const first = getGridIndex(x, y, z, grid.edge)
        const second = getGridIndex(x, y + 1, z, grid.edge)
        const firstInside = grid.distances[first]! < 0
        if (firstInside !== grid.distances[second]! < 0) {
          addSurfaceQuad({
            builder,
            cells,
            corners: [
              [x - 1, y, z - 1],
              [x - 1, y, z],
              [x, y, z],
              [x, y, z - 1],
            ],
            firstInside,
            resolution,
          })
        }
      }
    }
  }
  for (let z = 0; z < resolution; z += 1) {
    for (let y = 1; y < resolution; y += 1) {
      for (let x = 1; x < resolution; x += 1) {
        const first = getGridIndex(x, y, z, grid.edge)
        const second = getGridIndex(x, y, z + 1, grid.edge)
        const firstInside = grid.distances[first]! < 0
        if (firstInside !== grid.distances[second]! < 0) {
          addSurfaceQuad({
            builder,
            cells,
            corners: [
              [x - 1, y - 1, z],
              [x, y - 1, z],
              [x, y, z],
              [x - 1, y, z],
            ],
            firstInside,
            resolution,
          })
        }
      }
    }
  }
  return builder
}

const hasValidSpatialInput = (
  options: GenerateSpatialMeshOptions,
  operations: ReadonlyArray<PuppetSpatialPrimitive>,
  resolution: number,
): boolean => {
  const validSource =
    options.objects === undefined
      ? operations[0]?.mode === 'add'
      : options.objects.length === 1 && options.objects[0]?.visible === true
  return (
    operations.length > 0 &&
    validSource &&
    Number.isInteger(resolution) &&
    resolution >= MIN_RESOLUTION &&
    resolution <= MAX_RESOLUTION &&
    operations.every(
      (primitive) =>
        primitive.size.every((value) => Number.isFinite(value) && value > 0) &&
        primitive.center.every(Number.isFinite) &&
        (!('rotation' in primitive) ||
          (Array.isArray(primitive.rotation) &&
            primitive.rotation.length === COORDINATES &&
            primitive.rotation.every(Number.isFinite))) &&
        (primitive.smoothness === undefined ||
          (Number.isFinite(primitive.smoothness) && primitive.smoothness >= 0)),
    )
  )
}

/** Generates a triangle control mesh from editable primitive volume operations. */
export const generateSpatialMesh = (options: GenerateSpatialMeshOptions): PuppetSpatialMesh => {
  const resolution = options.resolution ?? DEFAULT_RESOLUTION
  const operations =
    options.operations ?? (options.objects === undefined ? [] : collectPrimitives(options.objects))
  if (!hasValidSpatialInput(options, operations, resolution)) {
    throw new RangeError('Invalid spatial mesh operations or resolution')
  }
  const source: PuppetSpatialMesh['source'] =
    options.objects === undefined
      ? {kind: 'generated', operations, resolution}
      : {kind: 'authored', objects: options.objects, resolution}
  const single = options.objects?.[0] ?? operations[0]
  if (
    single !== undefined &&
    'shape' in single &&
    single.shape === 'box' &&
    (options.objects === undefined ? operations.length === 1 : options.objects.length === 1)
  ) {
    return {indices: BOX_INDICES, source, vertices: createBoxVertices(single)}
  }
  const grid = createGrid({
    distance:
      options.objects === undefined
        ? compileFieldDistance(operations)
        : compileObjectDistance(options.objects[0]!),
    operations,
    resolution,
  })
  const builder = createSurfaceNet(grid, resolution)
  if (builder.indices.length === 0) {
    throw new RangeError('The spatial operations do not produce a surface')
  }
  return {
    indices: builder.indices,
    source,
    vertices: builder.vertices,
  }
}
