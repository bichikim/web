import {expect, test} from 'vitest'

import {generateSpatialMesh} from '../../../deformation/generate-spatial-mesh'
import {createDemoDocument, getDocumentScene, parseDocument} from '../../../player'
import {convertSceneContainers} from '../container-conversion'
import {setSpatialMesh} from '../set-spatial-mesh'

test('should bind child image points to the front of a generated 3D control mesh', () => {
  const document = convertSceneContainers({
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
  const updated = setSpatialMesh({document, mesh, nodeId: 'shapes'})!
  const node = getDocumentScene(updated).roots.find((candidate) => candidate.id === 'shapes')
  const part = updated.parts.find((candidate) => candidate.id === 'shape-circle')!

  expect(node).toMatchObject({kind: 'deformer', spatialMesh: {source: {kind: 'generated'}}})
  expect(part.spatial?.controlPoints.some((value, index) => index % 3 === 2 && value > 0)).toBe(
    true,
  )
  expect(part.spatial?.attachments).toHaveLength(part.mesh.vertices.length / 2)
  expect(
    part.spatial?.attachments?.every(
      (attachment) =>
        Math.abs(attachment.weights.reduce((sum, weight) => sum + weight, 0) - 1) < 0.000001,
    ),
  ).toBe(true)
  expect(parseDocument(JSON.stringify(updated)).ok).toBe(true)
  const invalidAttachment = {
    ...updated,
    parts: updated.parts.map((candidate) =>
      candidate.id === part.id
        ? {
            ...candidate,
            spatial: {
              ...candidate.spatial!,
              attachments: candidate.spatial!.attachments!.map((attachment, index) =>
                index === 0 ? {...attachment, triangleIndex: mesh.indices.length} : attachment,
              ),
            },
          }
        : candidate,
    ),
  }
  expect(parseDocument(JSON.stringify(invalidAttachment)).ok).toBe(false)
  const invalid = {
    ...updated,
    scene: {
      ...getDocumentScene(updated),
      roots: getDocumentScene(updated).roots.map((candidate) =>
        candidate.id === 'shapes' && candidate.kind === 'deformer'
          ? {...candidate, spatialMesh: {...mesh, indices: [mesh.vertices.length]}}
          : candidate,
      ),
    },
  }
  expect(parseDocument(JSON.stringify(invalid)).ok).toBe(false)
})

test('should persist an authored mesh with editable group children', () => {
  const document = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const box = {
    center: [388, 243, 0],
    id: 'box',
    kind: 'primitive',
    mode: 'add',
    name: '네모',
    rotation: [0, 0, 0],
    shape: 'box',
    size: [600, 500, 80],
    visible: true,
  } as const
  const sphere = {
    center: [420, 230, 0],
    id: 'sphere',
    kind: 'primitive',
    mode: 'add',
    name: '동그라미',
    rotation: [0, 0, 0],
    shape: 'sphere',
    size: [140, 140, 140],
    visible: true,
  } as const
  const objects = [
    {
      children: [box, sphere],
      id: 'group',
      kind: 'group',
      mode: 'add',
      name: '합친 메시',
      visible: true,
    },
  ] as const
  const mesh = generateSpatialMesh({objects, resolution: 12})
  const updated = setSpatialMesh({document, mesh, nodeId: 'shapes'})!
  expect(parseDocument(JSON.stringify(updated)).ok).toBe(true)
  expect(getDocumentScene(updated).roots.find((node) => node.id === 'shapes')).toMatchObject({
    spatialMesh: {source: {kind: 'authored', objects: [{children: [{id: 'box'}, {id: 'sphere'}]}]}},
  })
})
