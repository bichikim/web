import type {PuppetSpatialMesh} from '../player/document'

interface Accessor {
  readonly bufferView: number
  readonly byteOffset?: number
  readonly componentType: number
  readonly count: number
  readonly type: string
}
interface BufferView {
  readonly byteOffset?: number
  readonly byteLength: number
  readonly byteStride?: number
}
interface GlbDocument {
  readonly accessors?: Accessor[]
  readonly bufferViews?: BufferView[]
  readonly meshes?: {
    primitives: {attributes: {POSITION?: number}; indices?: number; mode?: number}[]
  }[]
}

const GLB_MAGIC = 0x46546c67
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942
const FLOAT = 5126
const UNSIGNED_SHORT = 5123
const UNSIGNED_INT = 5125
const TRIANGLES = 4
const COMPONENTS = 3
const HEADER_LENGTH = 12
const CHUNK_HEADER_LENGTH = 8
const UINT32_BYTES = 4
const UINT16_BYTES = 2
const CHUNK_TYPE_OFFSET = 4
const TOTAL_LENGTH_OFFSET = 8

interface ReadAccessorOptions {
  readonly binaryOffset: number
  readonly bytes: DataView
  readonly document: GlbDocument
  readonly expected: 'position' | 'indices'
  readonly index: number
}

const isExpectedAccessor = (accessor: Accessor, expected: ReadAccessorOptions['expected']) =>
  expected === 'position'
    ? accessor.type === 'VEC3' && accessor.componentType === FLOAT
    : accessor.type === 'SCALAR' &&
      (accessor.componentType === UNSIGNED_SHORT || accessor.componentType === UNSIGNED_INT)

const readComponent = (bytes: DataView, offset: number, componentType: number) => {
  if (componentType === FLOAT) {
    return bytes.getFloat32(offset, true)
  }
  return componentType === UNSIGNED_INT
    ? bytes.getUint32(offset, true)
    : bytes.getUint16(offset, true)
}

const readAccessor = (options: ReadAccessorOptions): number[] => {
  const {binaryOffset, bytes, document, expected, index: accessorIndex} = options
  const accessor = document.accessors?.[accessorIndex]
  const view = accessor === undefined ? undefined : document.bufferViews?.[accessor.bufferView]
  if (accessor === undefined || view === undefined) {
    throw new Error('GLB 접근자를 읽을 수 없습니다.')
  }
  const componentBytes =
    new Map([
      [FLOAT, UINT32_BYTES],
      [UNSIGNED_INT, UINT32_BYTES],
      [UNSIGNED_SHORT, UINT16_BYTES],
    ]).get(accessor.componentType) ?? 0
  const componentCount = accessor.type === 'VEC3' ? COMPONENTS : accessor.type === 'SCALAR' ? 1 : 0
  if (
    !isExpectedAccessor(accessor, expected) ||
    !Number.isInteger(accessor.count) ||
    accessor.count <= 0
  ) {
    throw new Error('지원하지 않는 GLB 정점 형식입니다.')
  }
  const stride = view.byteStride ?? componentBytes * componentCount
  const start = binaryOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const requiredBytes = (accessor.count - 1) * stride + componentBytes * componentCount
  if (
    stride < componentBytes * componentCount ||
    (accessor.byteOffset ?? 0) + requiredBytes > view.byteLength ||
    start + requiredBytes > bytes.byteLength
  ) {
    throw new Error('GLB 정점 데이터가 파일 범위를 벗어났습니다.')
  }
  return Array.from({length: accessor.count * componentCount}, (_, index) => {
    const offset =
      start +
      Math.floor(index / componentCount) * stride +
      (index % componentCount) * componentBytes
    return readComponent(bytes, offset, accessor.componentType)
  })
}

const readChunks = (buffer: ArrayBuffer) => {
  const bytes = new DataView(buffer)
  if (
    bytes.byteLength < HEADER_LENGTH ||
    bytes.getUint32(0, true) !== GLB_MAGIC ||
    bytes.getUint32(CHUNK_TYPE_OFFSET, true) !== 2 ||
    bytes.getUint32(TOTAL_LENGTH_OFFSET, true) !== bytes.byteLength
  ) {
    throw new Error('유효한 GLB 2.0 파일을 선택해 주세요.')
  }
  let offset = HEADER_LENGTH
  let json: GlbDocument | undefined
  let binaryOffset: number | undefined
  while (offset + CHUNK_HEADER_LENGTH <= bytes.byteLength) {
    const length = bytes.getUint32(offset, true)
    const type = bytes.getUint32(offset + CHUNK_TYPE_OFFSET, true)
    offset += CHUNK_HEADER_LENGTH
    if (offset + length > bytes.byteLength) {
      throw new Error('GLB 청크가 잘렸습니다.')
    }
    if (type === JSON_CHUNK) {
      json = JSON.parse(
        new TextDecoder().decode(new Uint8Array(buffer, offset, length)),
      ) as GlbDocument
    } else if (type === BIN_CHUNK) {
      binaryOffset = offset
    }
    offset += length
  }
  return {binaryOffset, bytes, json}
}

const normalizePositions = (
  positions: ReadonlyArray<number>,
  bounds: {x: number; y: number; width: number; height: number},
) => {
  const axisBounds = (axis: number) =>
    positions.reduce(
      (range, value, index) =>
        index % COMPONENTS === axis
          ? {maximum: Math.max(range.maximum, value), minimum: Math.min(range.minimum, value)}
          : range,
      {maximum: -Infinity, minimum: Infinity},
    )
  const {minimum: minX, maximum: maxX} = axisBounds(0)
  const {minimum: minY, maximum: maxY} = axisBounds(1)
  const {minimum: minZ, maximum: maxZ} = axisBounds(2)
  const centerZ = (minZ + maxZ) / 2
  const scale = Math.min(bounds.width / (maxX - minX || 1), bounds.height / (maxY - minY || 1))
  return positions.map((value, index) => {
    switch (index % COMPONENTS) {
      case 0:
        return bounds.x + bounds.width / 2 + (value - (minX + maxX) / 2) * scale
      case 1:
        return bounds.y + bounds.height / 2 - (value - (minY + maxY) / 2) * scale
      default:
        return (value - centerZ) * scale
    }
  })
}

/** Reads one static triangle mesh from a GLB; image materials are intentionally ignored. */
export const importSpatialMesh = (
  buffer: ArrayBuffer,
  name: string,
  bounds: {x: number; y: number; width: number; height: number},
): PuppetSpatialMesh => {
  const {binaryOffset, bytes, json} = readChunks(buffer)
  const primitive = json?.meshes?.[0]?.primitives[0]
  if (
    json === undefined ||
    binaryOffset === undefined ||
    json.meshes?.length !== 1 ||
    json.meshes[0]?.primitives.length !== 1 ||
    primitive?.attributes.POSITION === undefined ||
    (primitive.mode !== undefined && primitive.mode !== TRIANGLES)
  ) {
    throw new Error('삼각형으로 구성된 단일 GLB 메시가 필요합니다.')
  }
  const positions = readAccessor({
    binaryOffset,
    bytes,
    document: json,
    expected: 'position',
    index: primitive.attributes.POSITION,
  })
  const indices =
    primitive.indices === undefined
      ? Array.from({length: positions.length / COMPONENTS}, (_, index) => index)
      : readAccessor({
          binaryOffset,
          bytes,
          document: json,
          expected: 'indices',
          index: primitive.indices,
        })
  if (
    positions.length % COMPONENTS !== 0 ||
    indices.length % COMPONENTS !== 0 ||
    positions.some((value) => !Number.isFinite(value)) ||
    indices.some(
      (index) => !Number.isInteger(index) || index < 0 || index >= positions.length / COMPONENTS,
    )
  ) {
    throw new Error('GLB 메시의 정점 또는 삼각형 데이터가 잘못되었습니다.')
  }
  return {
    indices,
    source: {kind: 'imported', name},
    vertices: normalizePositions(positions, bounds),
  }
}
