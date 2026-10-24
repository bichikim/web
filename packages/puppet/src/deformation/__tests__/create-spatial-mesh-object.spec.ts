import {expect, test} from 'vitest'

import type {PuppetSpatialMesh} from '../../player'
import {createSpatialMeshObject} from '../create-spatial-mesh-object'
import {transformSpatialMeshObject} from '../transform-spatial-mesh-object'

test('should retain imported triangles while moving, rotating, and scaling them', () => {
  const mesh: PuppetSpatialMesh = {
    indices: [0, 1, 2],
    source: {kind: 'imported', name: 'triangle.glb'},
    vertices: [0, 0, 0, 2, 0, 0, 0, 2, 0],
  }
  const object = createSpatialMeshObject(mesh)
  const transformed = transformSpatialMeshObject({
    ...object,
    center: [10, 20, 0],
    rotation: [0, 0, 90],
    size: [4, 4, 1],
  })

  expect(object.name).toBe('triangle.glb')
  expect(transformed.indices).toEqual(mesh.indices)
  expect(transformed.vertices).toEqual(expect.arrayContaining([12, 18, 0, 12, 22, 0]))
})
