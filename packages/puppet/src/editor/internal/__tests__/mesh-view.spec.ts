import {describe, expect, it} from 'vitest'

import type {PuppetMesh} from '../../../player/document'
import {getIndexedVertices, getMeshViewTriangles, snapPointToEdge} from '../mesh-view'

const mesh: PuppetMesh = {
  indices: [0, 1, 2, 0, 2, 3],
  uvs: [0, 0, 1, 0, 1, 1, 0, 1],
  vertices: [0, 0, 10, 0, 10, 10, 0, 10],
}

describe('mesh view', () => {
  it('should project a draft vertex into render-ready triangles', () => {
    const vertices = getIndexedVertices({
      draftPoint: {x: -2, y: -3},
      mesh,
      selectedVertex: 0,
    })

    expect(vertices[0]).toEqual({index: 0, x: -2, y: -3})
    expect(getMeshViewTriangles({mesh, vertices})).toEqual([
      {first: vertices[0], index: 0, second: vertices[1], third: vertices[2]},
      {first: vertices[0], index: 1, second: vertices[2], third: vertices[3]},
    ])
  })

  it('should snap only when an edge is within the maximum distance', () => {
    expect(snapPointToEdge({maximumDistance: 2, mesh, point: {x: 5, y: 1}})).toEqual({x: 5, y: 0})
    expect(snapPointToEdge({maximumDistance: 0.5, mesh, point: {x: 5, y: 1}})).toEqual({
      x: 5,
      y: 1,
    })
  })
})
