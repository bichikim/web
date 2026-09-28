import {expect, test} from 'vitest'

import {createSpatialMeshDepthSampler} from '../sample-spatial-mesh'

test('should pick the frontmost overlapping triangle and leave uncovered image vertices flat', () => {
  const sample = createSpatialMeshDepthSampler({
    indices: [0, 1, 2, 3, 4, 5],
    source: {kind: 'imported', name: 'stack.glb'},
    vertices: [0, 0, -2, 10, 0, -2, 0, 10, -2, 0, 0, 4, 10, 0, 4, 0, 10, 4],
  })

  expect(sample(2, 2)).toBe(4)
  expect(sample(20, 20)).toBe(0)
})
