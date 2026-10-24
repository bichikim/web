import {expect, test} from 'vitest'

import {generateSpatialMesh} from '../generate-spatial-mesh'
import {createSpatialMeshFrontPreview} from '../create-spatial-mesh-preview'

test('should make a continuous front preview from a dense imported mesh', () => {
  const generated = generateSpatialMesh({
    operations: [
      {center: [5, 5, 0], id: 'first', mode: 'add', shape: 'box', size: [10, 10, 10]},
      {center: [7, 5, 0], id: 'second', mode: 'add', shape: 'box', size: [10, 10, 10]},
    ],
    resolution: 16,
  })
  const imported = {...generated, source: {kind: 'imported' as const, name: 'combined-boxes.glb'}}
  const preview = createSpatialMeshFrontPreview(imported, 16)!
  expect(preview.indices.length / 3).toBeGreaterThan(300)
  expect(preview.indices.length).toBeLessThan(imported.indices.length)
  expect(preview.vertices.some((value, index) => index % 3 === 2 && value > 0)).toBe(true)
})
