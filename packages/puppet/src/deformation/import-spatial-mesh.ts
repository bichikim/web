import {Matrix4, Quaternion, Vector3} from 'three'
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
interface GlbNode {
  readonly children?: number[]
  readonly matrix?: number[]
  readonly mesh?: number
  readonly rotation?: number[]
  readonly scale?: number[]
  readonly skin?: number
  readonly translation?: number[]
}
interface GlbScene {
  readonly nodes?: number[]
}
interface GlbDocument {
  readonly accessors?: Accessor[]
  readonly bufferViews?: BufferView[]
  readonly meshes?: {
    primitives: {attributes: {POSITION?: number}; indices?: number; mode?: number}[]
  }[]
  readonly nodes?: GlbNode[]
  readonly scene?: number
  readonly scenes?: GlbScene[]
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
const UINT8_BYTES = 1
const UNSIGNED_BYTE = 5121
const CHUNK_TYPE_OFFSET = 4
const TOTAL_LENGTH_OFFSET = 8
const TRANSFORM_COMPONENTS = 4
const MATRIX_COMPONENTS = 16
const QUATERNION_TOLERANCE = 1e-5

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
      (accessor.componentType === UNSIGNED_BYTE ||
        accessor.componentType === UNSIGNED_SHORT ||
        accessor.componentType === UNSIGNED_INT)

const readComponent = (bytes: DataView, offset: number, componentType: number) => {
  if (componentType === FLOAT) {
    return bytes.getFloat32(offset, true)
  }
  if (componentType === UNSIGNED_INT) {
    return bytes.getUint32(offset, true)
  }
  return componentType === UNSIGNED_SHORT ? bytes.getUint16(offset, true) : bytes.getUint8(offset)
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
      [UNSIGNED_BYTE, UINT8_BYTES],
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

const getTransformComponents = (
  values: ReadonlyArray<number> | undefined,
  defaults: ReadonlyArray<number>,
  length: number,
): ReadonlyArray<number> => {
  const components = values ?? defaults
  if (components.length !== length || components.some((value) => !Number.isFinite(value))) {
    throw new Error('GLB 노드 변환 데이터가 잘못되었습니다.')
  }
  return components
}

const getNodeTransform = (node: GlbNode): Matrix4 => {
  if (node.skin !== undefined) {
    throw new Error('스킨이 적용된 GLB 메시를 가져올 수 없습니다.')
  }
  if (node.matrix !== undefined) {
    if (
      node.translation !== undefined ||
      node.rotation !== undefined ||
      node.scale !== undefined ||
      node.matrix.length !== MATRIX_COMPONENTS ||
      node.matrix.some((value) => !Number.isFinite(value))
    ) {
      throw new Error('GLB 노드 변환 데이터가 잘못되었습니다.')
    }
    return new Matrix4().fromArray(node.matrix)
  }
  const translation = getTransformComponents(node.translation, [0, 0, 0], COMPONENTS)
  const rotation = getTransformComponents(node.rotation, [0, 0, 0, 1], TRANSFORM_COMPONENTS)
  const scale = getTransformComponents(node.scale, [1, 1, 1], COMPONENTS)
  const [rotationX, rotationY, rotationZ, rotationW] = rotation
  const quaternion = new Quaternion(rotationX, rotationY, rotationZ, rotationW)
  if (Math.abs(quaternion.lengthSq() - 1) > QUATERNION_TOLERANCE) {
    throw new Error('GLB 회전 쿼터니언이 정규화되지 않았습니다.')
  }
  return new Matrix4().compose(
    new Vector3(translation[0], translation[1], translation[2]),
    quaternion,
    new Vector3(scale[0], scale[1], scale[2]),
  )
}

const getMeshTransform = (document: GlbDocument): Matrix4 => {
  const {nodes} = document
  if (nodes === undefined || nodes.length === 0) {
    return new Matrix4()
  }
  const scenes = document.scenes ?? []
  const sceneIndex = document.scene ?? (scenes.length === 1 ? 0 : undefined)
  const roots =
    scenes.length === 0
      ? nodes.flatMap((_, index) =>
          nodes.some((node) => node.children?.includes(index) === true) ? [] : [index],
        )
      : sceneIndex === undefined
        ? undefined
        : scenes[sceneIndex]?.nodes
  if (roots === undefined) {
    throw new Error('가져올 GLB 장면을 하나 선택해 주세요.')
  }
  const activeNodes = new Set<number>()
  const meshTransforms: Matrix4[] = []
  const visit = (index: number, parentTransform: Matrix4): void => {
    const node = nodes[index]
    if (node === undefined || activeNodes.has(index)) {
      throw new Error('GLB 장면 계층이 잘못되었습니다.')
    }
    activeNodes.add(index)
    const transform = new Matrix4().multiplyMatrices(parentTransform, getNodeTransform(node))
    if (node.mesh !== undefined) {
      if (node.mesh !== 0) {
        throw new Error('가져올 GLB 장면에 지원하지 않는 메시가 있습니다.')
      }
      meshTransforms.push(transform)
    }
    node.children?.forEach((child) => visit(child, transform))
    activeNodes.delete(index)
  }
  roots.forEach((index) => visit(index, new Matrix4()))
  if (meshTransforms.length !== 1) {
    throw new Error('가져올 GLB 장면에 메시 노드가 하나 있어야 합니다.')
  }
  return meshTransforms[0]!
}

const transformPositions = (positions: ReadonlyArray<number>, transform: Matrix4) =>
  Array.from({length: positions.length / COMPONENTS}, (_, index) => {
    const vertex = new Vector3(
      positions[index * COMPONENTS]!,
      positions[index * COMPONENTS + 1]!,
      positions[index * COMPONENTS + 2]!,
    ).applyMatrix4(transform)
    return vertex.toArray()
  }).flat()

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
    vertices: normalizePositions(transformPositions(positions, getMeshTransform(json)), bounds),
  }
}
