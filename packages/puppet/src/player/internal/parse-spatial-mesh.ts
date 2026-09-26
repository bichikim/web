const COORDINATES = 3
const MIN_RESOLUTION = 4
const MAX_RESOLUTION = 32
const MAX_OBJECT_DEPTH = 12

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item))

const isTriple = (value: unknown): value is [number, number, number] =>
  isFiniteNumbers(value) && value.length === COORDINATES

const isPrimitive = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  ['add', 'subtract', 'intersect', 'smooth-add'].includes(String(value.mode)) &&
  ['box', 'sphere', 'cylinder', 'prism'].includes(String(value.shape)) &&
  isTriple(value.center) &&
  isTriple(value.size) &&
  value.size.every((size) => size > 0) &&
  (value.smoothness === undefined ||
    (typeof value.smoothness === 'number' &&
      Number.isFinite(value.smoothness) &&
      value.smoothness >= 0))

const isObject = (value: unknown, depth = 0): boolean => {
  if (
    !isRecord(value) ||
    depth > MAX_OBJECT_DEPTH ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.name !== 'string' ||
    typeof value.visible !== 'boolean' ||
    !['add', 'subtract', 'intersect', 'smooth-add'].includes(String(value.mode))
  ) {
    return false
  }
  if (value.kind === 'primitive') {
    return isPrimitive(value) && isTriple(value.rotation)
  }
  return (
    value.kind === 'group' &&
    Array.isArray(value.children) &&
    value.children.length >= 2 &&
    isRecord(value.children[0]) &&
    value.children[0].mode === 'add' &&
    value.children.every((child: unknown) => isObject(child, depth + 1)) &&
    (value.smoothness === undefined ||
      (typeof value.smoothness === 'number' &&
        Number.isFinite(value.smoothness) &&
        value.smoothness >= 0))
  )
}

const hasValidGeometry = (value: Record<string, unknown>): boolean =>
  isFiniteNumbers(value.vertices) &&
  value.vertices.length > 0 &&
  value.vertices.length % COORDINATES === 0 &&
  Array.isArray(value.indices) &&
  value.indices.length > 0 &&
  value.indices.length % COORDINATES === 0 &&
  value.indices.every(
    (index: unknown) =>
      typeof index === 'number' &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < (value.vertices as number[]).length / COORDINATES,
  )

const hasValidResolution = (value: unknown): boolean =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_RESOLUTION &&
  value <= MAX_RESOLUTION

/** Validates the persisted triangle mesh and its editable source. */
export const isSpatialMesh = (value: unknown): boolean => {
  if (!isRecord(value) || !hasValidGeometry(value) || !isRecord(value.source)) {
    return false
  }
  if (value.source.kind === 'imported') {
    return typeof value.source.name === 'string'
  }
  if (value.source.kind === 'authored') {
    return (
      Array.isArray(value.source.objects) &&
      value.source.objects.length === 1 &&
      value.source.objects.every((object: unknown) => isObject(object)) &&
      hasValidResolution(value.source.resolution)
    )
  }
  return (
    value.source.kind === 'generated' &&
    Array.isArray(value.source.operations) &&
    value.source.operations.length > 0 &&
    isRecord(value.source.operations[0]) &&
    value.source.operations[0].mode === 'add' &&
    value.source.operations.every(isPrimitive) &&
    hasValidResolution(value.source.resolution)
  )
}
