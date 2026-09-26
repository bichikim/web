import {describe, expect, test} from 'vitest'

import type {PuppetDocument, PuppetPart} from '../../../player'
import {createSpatialMeshAttachmentSampler} from '../../../deformation/bind-spatial-mesh'
import {reconcileSpatialSurface} from '../reconcile-spatial-surface'

const part: PuppetPart = {
  id: 'face',
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 10, 0, 0, 10]},
  spatial: {controlPoints: [0, 0, 1, 10, 0, 2, 0, 10, 3], origin: [0, 0, 0]},
  texture: {height: 10, src: 'face.png', width: 10},
}

describe('reconcileSpatialSurface', () => {
  test('should keep triangle links when image vertices move or change topology', () => {
    const spatialMesh = {
      indices: [0, 1, 2],
      source: {kind: 'imported' as const, name: 'front.glb'},
      vertices: [0, 0, 4, 10, 0, 4, 0, 10, 4],
    }
    const sample = createSpatialMeshAttachmentSampler(spatialMesh)
    const attachments = [
      [0, 0],
      [10, 0],
      [0, 10],
    ].map(([x, y]) => sample(x!, y!)!.attachment)
    const attached = {
      ...part,
      spatial: {...part.spatial!, attachments, controlPoints: [0, 0, 4, 10, 0, 4, 0, 10, 4]},
    }
    const document: PuppetDocument = {
      format: 'winter-love-puppet',
      motions: [],
      parts: [attached],
      scene: {
        roots: [
          {
            bounds: {height: 10, width: 10, x: 0, y: 0},
            children: [{id: 'face', kind: 'part', locked: false, name: 'Face', visible: true}],
            columns: 2,
            controlPoints: [0, 0, 10, 0, 0, 10, 10, 10],
            deformerType: 'spatial',
            id: 'spatial',
            kind: 'deformer',
            locked: false,
            name: '3D',
            rows: 2,
            spatialMesh,
            spatialOrigin: [0, 0, 0],
            spatialRotationParameterIds: [null, null, null],
            visible: true,
          },
        ],
      },
      version: 1,
      viewport: {height: 10, width: 10},
    }
    const grouped = {...attached, spatial: {...attached.spatial!, groupId: 'spatial'}}
    const moved = reconcileSpatialSurface({
      document,
      mesh: {...part.mesh, vertices: [0, 0, 12, 2, 0, 10]},
      part: grouped,
    })!
    expect(moved.attachments?.[1]?.offset).toEqual([2, 2, 0])
    const added = reconcileSpatialSurface({
      addedVertexIndex: 1,
      document,
      mesh: {...part.mesh, vertices: [0, 0, 3, 3, 10, 0, 0, 10]},
      part: grouped,
    })!
    expect(added.attachments).toHaveLength(4)
    expect(added.attachments?.[1]?.weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1)
    expect(added.controlPoints.slice(3, 6)).toEqual([3, 3, 4])
  })

  test('should carry XY mesh edits into XYZ points while retaining sculpted depth', () => {
    const mesh = {...part.mesh, vertices: [0, 0, 12, 2, 0, 10]}
    expect(reconcileSpatialSurface({mesh, part})?.controlPoints).toEqual([
      0, 0, 1, 12, 2, 2, 0, 10, 3,
    ])
  })

  test('should append and remove the corresponding 3D point as topology changes', () => {
    const addedMesh = {...part.mesh, vertices: [...part.mesh.vertices, 3, 3]}
    expect(reconcileSpatialSurface({mesh: addedMesh, part})?.controlPoints).toEqual([
      0, 0, 1, 10, 0, 2, 0, 10, 3, 3, 3, 0,
    ])
    const removedMesh = {...part.mesh, vertices: [0, 0, 0, 10]}
    expect(
      reconcileSpatialSurface({mesh: removedMesh, part, removedVertexIndex: 1})?.controlPoints,
    ).toEqual([0, 0, 1, 0, 10, 3])
  })
})
