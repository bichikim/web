import {expect, test} from 'vitest'

import {compileSpatialMeshDistance} from '../compile-spatial-mesh-distance'
import {createSpatialMeshObject} from '../create-spatial-mesh-object'
import {generateSpatialMesh} from '../generate-spatial-mesh'

test('should distinguish the inside and outside of an imported closed mesh', () => {
  const mesh = generateSpatialMesh({
    operations: [{center: [0, 0, 0], id: 'box', mode: 'add', shape: 'box', size: [2, 2, 2]}],
  })
  const distance = compileSpatialMeshDistance(createSpatialMeshObject(mesh))

  expect(distance([0, 0, 0])).toBeLessThan(0)
  expect(distance([3, 0, 0])).toBeGreaterThan(0)
})

test('should reject an open imported surface for Boolean composition', () => {
  const object = createSpatialMeshObject({
    indices: [0, 1, 2],
    source: {kind: 'imported', name: 'plane.glb'},
    vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
  })

  expect(() => compileSpatialMeshDistance(object)).toThrow('닫힌 3D 형상')
})
