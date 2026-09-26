import {expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {convertSceneContainers} from '../container-conversion'
import {getSceneNode} from '../scene-graph'
import {
  createSpatialPreviewEdgeIndices,
  createSpatialPreviewGeometry,
} from '../spatial-preview-geometry'

test('should omit the coplanar diagonal while keeping the outline edges', () => {
  const edges = createSpatialPreviewEdgeIndices(
    new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
    new Uint32Array([0, 1, 2, 0, 2, 3]),
    35,
  )
  const pairs = Array.from({length: edges.length / 2}, (_, index) =>
    [edges[index * 2]!, edges[index * 2 + 1]!].sort().join(':'),
  )

  expect(pairs).toHaveLength(4)
  expect(new Set(pairs).size).toBe(4)
})

test('should project the applied control mesh into the Pixi canvas view', () => {
  const document = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const selected = getSceneNode(document, 'shapes')
  expect(selected?.kind).toBe('deformer')
  if (selected?.kind !== 'deformer') {
    return
  }
  const mesh = {
    indices: [0, 1, 2],
    source: {kind: 'imported' as const, name: 'triangle.glb'},
    vertices: [0, 0, 1, 100, 0, 1, 0, 100, 1],
  }
  const node = {...selected, spatialMesh: mesh, spatialTranslation: [10, 20, 5] as const}
  const preview = createSpatialPreviewGeometry({document, mesh, node})

  expect([...preview.indices]).toEqual(mesh.indices)
  expect([...preview.positions]).toEqual([10, -20, 6, 110, -20, 6, 10, -120, 6])
  expect(preview.viewBox.width).toBe(document.viewport.width * 1.5)
})
