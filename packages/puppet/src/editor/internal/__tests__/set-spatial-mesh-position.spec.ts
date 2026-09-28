import {expect, test} from 'vitest'

import {generateSpatialMesh} from '../../../deformation/generate-spatial-mesh'
import {
  placeSpatialMesh,
  resolveSpatialMeshAttachment,
} from '../../../deformation/bind-spatial-mesh'
import {createDemoDocument, getDocumentScene, parseDocument} from '../../../player'
import {getSpatialPartPose} from '../../../player/internal/spatial-part'
import {convertSceneContainers} from '../container-conversion'
import {setSpatialMesh} from '../set-spatial-mesh'
import {setSpatialMeshPosition} from '../set-spatial-mesh-position'

test('moves the bind mesh independently of pose translation and keeps image vertices in place', () => {
  const source = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const mesh = generateSpatialMesh({
    operations: [
      {center: [388, 243, 0], id: 'box', mode: 'add', shape: 'box', size: [600, 500, 80]},
    ],
  })
  const bound = setSpatialMesh({document: source, mesh, nodeId: 'shapes'})!
  const sculpted = {
    ...bound,
    parts: bound.parts.map((part) =>
      part.id === 'shape-circle'
        ? {
            ...part,
            spatial: {
              ...part.spatial!,
              attachments: part.spatial!.attachments!.map((attachment, index) =>
                index === 0 ? {...attachment, offset: [0, 0, 7] as const} : attachment,
              ),
              controlPoints: part.spatial!.controlPoints.map((coordinate, index) =>
                index === 2 ? coordinate + 7 : coordinate,
              ),
            },
          }
        : part,
    ),
  }
  const original = sculpted.parts.find((part) => part.id === 'shape-circle')!
  const positioned = setSpatialMeshPosition({
    document: sculpted,
    nodeId: 'shapes',
    position: [20, 0, 12],
  })!
  const part = positioned.parts.find((candidate) => candidate.id === original.id)!
  const deformer = getDocumentScene(positioned).roots.find((node) => node.id === 'shapes')!

  expect(deformer).toMatchObject({spatialMeshPosition: [20, 0, 12], spatialTranslation: [0, 0, 0]})
  expect(deformer.kind === 'deformer' && deformer.spatialMesh?.vertices).toEqual(mesh.vertices)
  const before = getSpatialPartPose({document: sculpted, part: original})!.vertices
  const after = getSpatialPartPose({document: positioned, part})!.vertices
  after.forEach((coordinate, index) => expect(coordinate).toBeCloseTo(before[index]!))
  expect(part.spatial!.controlPoints[2]).toBeCloseTo(original.spatial!.controlPoints[2]! + 12)
  expect(part.spatial!.attachments![0]!.offset[2]).toBe(7)
  resolveSpatialMeshAttachment(
    placeSpatialMesh(mesh, [20, 0, 12]),
    part.spatial!.attachments![0]!,
  )!.forEach((coordinate, index) =>
    expect(coordinate).toBeCloseTo(part.spatial!.controlPoints[index]!),
  )
  expect(parseDocument(JSON.stringify(positioned)).ok).toBe(true)

  const movedAgain = setSpatialMeshPosition({
    document: positioned,
    nodeId: 'shapes',
    position: [25, 0, 12],
  })!
  expect(
    movedAgain.parts.find((candidate) => candidate.id === part.id)?.spatial?.controlPoints[2],
  ).toBeCloseTo(part.spatial!.controlPoints[2]!)
})

test('rejects invalid bind mesh coordinates', () => {
  const source = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const invalid = {
    ...source,
    scene: {
      ...getDocumentScene(source),
      roots: getDocumentScene(source).roots.map((node) =>
        node.kind === 'deformer' && node.id === 'shapes'
          ? {...node, spatialMeshPosition: [Number.NaN, 0, 0] as const}
          : node,
      ),
    },
  }
  expect(parseDocument(JSON.stringify(invalid)).ok).toBe(false)
})
