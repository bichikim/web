import {expect, test} from 'vitest'

import {importSpatialMesh} from '../import-spatial-mesh'

const HEADER = 12
const CHUNK_HEADER = 8
const FLOAT_BYTES = 4
const POSITION_COUNT = 9
const MAGIC = 0x46546c67
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

test('should read static GLB geometry and fit it to image bounds without materials', () => {
  const gltf = {
    accessors: [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3'}],
    bufferViews: [{buffer: 0, byteLength: POSITION_COUNT * FLOAT_BYTES}],
    meshes: [{primitives: [{attributes: {POSITION: 0}}]}],
  }
  const source = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonLength = Math.ceil(source.length / FLOAT_BYTES) * FLOAT_BYTES
  const binaryLength = POSITION_COUNT * FLOAT_BYTES
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

  const mesh = importSpatialMesh(buffer, 'control.glb', {height: 200, width: 200, x: 100, y: 100})
  expect(mesh.source).toEqual({kind: 'imported', name: 'control.glb'})
  expect(mesh.indices).toEqual([0, 1, 2])
  expect(mesh.vertices).toEqual([100, 300, -50, 300, 300, 50, 100, 100, -50])
})
