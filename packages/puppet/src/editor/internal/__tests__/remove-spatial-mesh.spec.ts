import {expect, test} from 'vitest'

import {generateSpatialMesh} from '../../../deformation/generate-spatial-mesh'
import {createDemoDocument, getDocumentScene, parseDocument} from '../../../player'
import {convertSceneContainers} from '../container-conversion'
import {removeSpatialMesh} from '../remove-spatial-mesh'
import {setSceneNodeState} from '../scene-graph'
import {setSpatialMesh} from '../set-spatial-mesh'
import {setSpatialMeshPosition} from '../set-spatial-mesh-position'

test('should remove an applied mesh and clear its depth while preserving part positions', () => {
  const source = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const mesh = generateSpatialMesh({
    operations: [
      {center: [388, 243, 0], id: 'body', mode: 'add', shape: 'box', size: [600, 500, 80]},
    ],
    resolution: 12,
  })
  const applied = setSpatialMeshPosition({
    document: setSpatialMesh({document: source, mesh, nodeId: 'shapes'})!,
    nodeId: 'shapes',
    position: [12, 0, 0],
  })!
  const part = applied.parts.find((candidate) => candidate.id === 'shape-circle')!
  const edited = {
    ...applied,
    parts: applied.parts.map((candidate) =>
      candidate.id === part.id
        ? {
            ...candidate,
            spatial: {
              ...candidate.spatial!,
              controlPoints: candidate.spatial!.controlPoints.map((value, index) =>
                index === 0 ? value + 7 : value,
              ),
            },
          }
        : candidate,
    ),
  }
  const removed = removeSpatialMesh({document: edited, nodeId: 'shapes'})!
  const points = removed.parts.find((candidate) => candidate.id === part.id)!.spatial!.controlPoints

  expect(getDocumentScene(removed).roots.find((node) => node.id === 'shapes')).toMatchObject({
    kind: 'deformer',
    spatialMesh: undefined,
    spatialMeshPosition: undefined,
  })
  expect(points[0]).toBe(part.spatial!.controlPoints[0]! + 7)
  expect(points.every((value, index) => index % 3 !== 2 || value === 0)).toBe(true)
  expect(parseDocument(JSON.stringify(removed)).ok).toBe(true)
})

test('should reject removal from a locked 3D deformer', () => {
  const source = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const locked = setSceneNodeState({document: source, locked: true, nodeId: 'shapes'})!

  expect(removeSpatialMesh({document: locked, nodeId: 'shapes'})).toBeUndefined()
})
