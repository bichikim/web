import {expect, test} from 'vitest'

import {importSpatialMesh} from '../import-spatial-mesh'

const HEADER = 12
const CHUNK_HEADER = 8
const FLOAT_BYTES = 4
const POSITION_COUNT = 9
const POSITION_BYTES = POSITION_COUNT * FLOAT_BYTES
const MAGIC = 0x46546c67
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

const createGlb = (gltf: object, indices: ReadonlyArray<number> = []) => {
  const source = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonLength = Math.ceil(source.length / FLOAT_BYTES) * FLOAT_BYTES
  const binaryLength = Math.ceil((POSITION_BYTES + indices.length) / FLOAT_BYTES) * FLOAT_BYTES
  const buffer = new ArrayBuffer(HEADER + CHUNK_HEADER + jsonLength + CHUNK_HEADER + binaryLength)
  const bytes = new DataView(buffer)
  bytes.setUint32(0, MAGIC, true)
  bytes.setUint32(4, 2, true)
  bytes.setUint32(8, buffer.byteLength, true)
  bytes.setUint32(HEADER, jsonLength, true)
  bytes.setUint32(HEADER + FLOAT_BYTES, JSON_CHUNK, true)
  const jsonOffset = HEADER + CHUNK_HEADER
  new Uint8Array(buffer, jsonOffset, jsonLength).fill(32)
  new Uint8Array(buffer, jsonOffset, source.length).set(source)
  const binaryHeader = jsonOffset + jsonLength
  bytes.setUint32(binaryHeader, binaryLength, true)
  bytes.setUint32(binaryHeader + FLOAT_BYTES, BIN_CHUNK, true)
  const binaryOffset = binaryHeader + CHUNK_HEADER
  const positions = [-1, -1, 0, 1, -1, 1, -1, 1, 0]
  positions.forEach((value, index) =>
    bytes.setFloat32(binaryOffset + index * FLOAT_BYTES, value, true),
  )
  indices.forEach((value, index) => bytes.setUint8(binaryOffset + POSITION_BYTES + index, value))
  return buffer
}

test('should read static GLB geometry and fit it to image bounds without materials', () => {
  const buffer = createGlb({
    accessors: [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3'}],
    bufferViews: [{buffer: 0, byteLength: POSITION_COUNT * FLOAT_BYTES}],
    meshes: [{primitives: [{attributes: {POSITION: 0}}]}],
  })

  const mesh = importSpatialMesh(buffer, 'control.glb', {height: 200, width: 200, x: 100, y: 100})
  expect(mesh.source).toEqual({kind: 'imported', name: 'control.glb'})
  expect(mesh.indices).toEqual([0, 1, 2])
  expect(mesh.vertices).toEqual([100, 300, -50, 300, 300, 50, 100, 100, -50])
})

test('should bake the active scene node hierarchy into imported geometry', () => {
  const rotation = Math.SQRT1_2
  const buffer = createGlb({
    accessors: [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3'}],
    bufferViews: [{buffer: 0, byteLength: POSITION_COUNT * FLOAT_BYTES}],
    meshes: [{primitives: [{attributes: {POSITION: 0}}]}],
    nodes: [
      {children: [1], scale: [2, 1, 1]},
      {mesh: 0, rotation: [0, 0, rotation, rotation]},
    ],
    scene: 0,
    scenes: [{nodes: [0]}],
  })

  const mesh = importSpatialMesh(buffer, 'transformed.glb', {
    height: 200,
    width: 200,
    x: 100,
    y: 100,
  })

  expect(mesh.vertices.map((value) => Number(value.toFixed(5)))).toEqual([
    300, 250, -25, 300, 150, 25, 100, 250, -25,
  ])
})

test('should read uint8 triangle indices and bake a node matrix transform', () => {
  const buffer = createGlb(
    {
      accessors: [
        {bufferView: 0, componentType: 5126, count: 3, type: 'VEC3'},
        {bufferView: 1, componentType: 5121, count: 3, type: 'SCALAR'},
      ],
      bufferViews: [
        {buffer: 0, byteLength: POSITION_BYTES},
        {buffer: 0, byteLength: 3, byteOffset: POSITION_BYTES},
      ],
      meshes: [{primitives: [{attributes: {POSITION: 0}, indices: 1}]}],
      nodes: [{matrix: [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], mesh: 0}],
      scene: 0,
      scenes: [{nodes: [0]}],
    },
    [0, 1, 2],
  )

  const mesh = importSpatialMesh(buffer, 'matrix.glb', {
    height: 200,
    width: 200,
    x: 100,
    y: 100,
  })

  expect(mesh.indices).toEqual([0, 1, 2])
  expect(mesh.vertices.map((value) => Number(value.toFixed(5)))).toEqual([
    100, 250, -25, 300, 250, 25, 100, 150, -25,
  ])
})
