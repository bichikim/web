import {describe, expect, test} from 'vitest'

import type {PuppetDocument, PuppetPart} from '../../document'
import {getSpatialPartPose} from '../spatial-part'
import {generateSpatialMesh} from '../../../deformation/generate-spatial-mesh'
import {composeParameterScene} from '../../../deformation/scene'
import {setSpatialMesh} from '../../../editor/internal/set-spatial-mesh'

const part: PuppetPart = {
  id: 'front',
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 10, 0, 0, 10]},
  spatial: {
    controlPoints: [0, 0, 0, 10, 0, 0, 0, 10, 0],
    origin: [0, 0, 0],
    rotationParameterIds: [null, 'turn', null],
  },
  texture: {height: 10, src: 'front.png', width: 10},
}

const document: PuppetDocument = {
  format: 'winter-love-puppet',
  motions: [],
  parameters: [{defaultValue: 0, id: 'turn', maximum: 180, minimum: 0, name: 'Turn'}],
  parts: [part],
  version: 1,
  viewport: {height: 100, width: 100},
}

describe('getSpatialPartPose', () => {
  test('should apply 3D translation and scale to image vertices and depth', () => {
    const groupedPart: PuppetPart = {
      ...part,
      spatial: {...part.spatial!, groupId: 'spatial'},
    }
    const transformed: PuppetDocument = {
      ...document,
      parts: [groupedPart],
      scene: {
        roots: [
          {
            bounds: {height: 10, width: 10, x: 0, y: 0},
            children: [{id: part.id, kind: 'part', locked: false, name: 'Front', visible: true}],
            columns: 1,
            controlPoints: [0, 0, 10, 0, 0, 10, 10, 10],
            deformerType: 'spatial',
            id: 'spatial',
            kind: 'deformer',
            locked: false,
            name: '3D',
            rows: 1,
            spatialOrigin: [0, 0, 0],
            spatialRotation: [0, 0, 0],
            spatialRotationParameterIds: [null, null, null],
            spatialScale: [2, 3, 4],
            spatialTranslation: [4, -2, 3],
            visible: true,
          },
        ],
      },
    }

    const pose = getSpatialPartPose({document: transformed, part: groupedPart})!
    expect(pose.vertices).toEqual([4, -2, 24, -2, 4, 28])
    expect(pose.depths).toEqual([3, 3, 3])
  })

  test('should follow the attached mesh triangle when its geometry changes', () => {
    const mesh = generateSpatialMesh({
      operations: [{center: [5, 5, 0], id: 'box', mode: 'add', shape: 'box', size: [20, 20, 10]}],
      resolution: 8,
    })
    const groupedPart = {...part, spatial: {...part.spatial!, groupId: 'spatial'}}
    const source: PuppetDocument = {
      ...document,
      parts: [groupedPart],
      scene: {
        roots: [
          {
            bounds: {height: 10, width: 10, x: 0, y: 0},
            children: [{id: 'front', kind: 'part', locked: false, name: 'Front', visible: true}],
            columns: 2,
            controlPoints: [0, 0, 10, 0, 0, 10, 10, 10],
            deformerType: 'spatial',
            id: 'spatial',
            kind: 'deformer',
            locked: false,
            name: '3D',
            rows: 2,
            spatialOrigin: [0, 0, 0],
            spatialRotation: [0, 90, 0],
            spatialRotationParameterIds: [null, null, null],
            visible: true,
          },
        ],
      },
    }
    const bound = setSpatialMesh({document: source, mesh, nodeId: 'spatial'})!
    const attachment = bound.parts[0]!.spatial!.attachments![0]!
    const weightIndex = attachment.weights.indexOf(Math.max(...attachment.weights))
    const vertexIndex = mesh.indices[attachment.triangleIndex * 3 + weightIndex]!
    const vertices = [...mesh.vertices]
    vertices[vertexIndex * 3 + 2] += 10
    const changed: PuppetDocument = {
      ...bound,
      scene: {
        roots: bound.scene!.roots.map((node) =>
          node.kind === 'deformer' ? {...node, spatialMesh: {...mesh, vertices}} : node,
        ),
      },
    }
    const before = getSpatialPartPose({document: bound, part: bound.parts[0]!})!
    const after = getSpatialPartPose({document: changed, part: changed.parts[0]!})!
    expect(after.vertices[0]! - before.vertices[0]!).toBeCloseTo(
      10 * attachment.weights[weightIndex]!,
    )
  })

  test('should resample a positioned mesh beneath fixed image vertices', () => {
    const mesh = {
      indices: [0, 1, 2],
      source: {kind: 'imported' as const, name: 'slope.glb'},
      vertices: [0, 0, 0, 10, 0, 10, 0, 10, 0],
    }
    const groupedPart = {
      ...part,
      spatial: {
        ...part.spatial!,
        groupId: 'spatial',
        rotationParameterIds: [null, null, null] as const,
      },
    }
    const node = {
      bounds: {height: 10, width: 10, x: 0, y: 0},
      children: [{id: 'front', kind: 'part' as const, locked: false, name: 'Front', visible: true}],
      columns: 1,
      controlPoints: [0, 0, 10, 0, 0, 10, 10, 10],
      deformerType: 'spatial' as const,
      id: 'spatial',
      kind: 'deformer' as const,
      locked: false,
      name: '3D',
      rows: 1,
      spatialMeshPosition: [2, 0, 1] as const,
      spatialOrigin: [0, 0, 0] as const,
      spatialRotationParameterIds: [null, null, null] as const,
      visible: true,
    }
    const source: PuppetDocument = {
      ...document,
      parameterBindings: [
        {
          id: 'place',
          keyforms: [
            {
              deformers: [
                {
                  controlPoints: node.controlPoints,
                  kind: 'deformer',
                  nodeId: node.id,
                  spatialMeshPosition: [2, 0, 1],
                },
              ],
              parts: [],
              values: [0],
            },
            {
              deformers: [
                {
                  controlPoints: node.controlPoints,
                  kind: 'deformer',
                  nodeId: node.id,
                  spatialMeshPosition: [4, 0, 1],
                },
              ],
              parts: [],
              values: [1],
            },
          ],
          parameterIds: ['place'],
          targetDeformerIds: [node.id],
          targetPartIds: [],
        },
      ],
      parameters: [{defaultValue: 0, id: 'place', maximum: 1, minimum: 0, name: 'Place'}],
      parts: [groupedPart],
      scene: {roots: [node]},
    }
    const bound = setSpatialMesh({document: source, mesh, nodeId: node.id})!
    const boundPart = bound.parts[0]!
    const rest = getSpatialPartPose({
      document: bound,
      parameterValues: {place: 0},
      part: boundPart,
    })!
    const moved = getSpatialPartPose({
      document: bound,
      parameterValues: {place: 1},
      part: boundPart,
    })!

    expect(moved.vertices).toEqual(rest.vertices)
    expect(moved.depths[0]).toBeCloseTo(rest.depths[0]!)
    expect(moved.depths[1]).toBeCloseTo(rest.depths[1]! - 2)

    const turned: PuppetDocument = {
      ...bound,
      scene: {roots: [{...node, spatialMesh: mesh, spatialRotation: [0, 45, 0]}]},
    }
    const turnedRest = getSpatialPartPose({
      document: turned,
      parameterValues: {place: 0},
      part: boundPart,
    })!
    const turnedMoved = getSpatialPartPose({
      document: turned,
      parameterValues: {place: 1},
      part: boundPart,
    })!
    expect(turnedMoved.vertices[0]).toBeCloseTo(turnedRest.vertices[0]!)
    expect(turnedMoved.vertices[2]).toBeLessThan(turnedRest.vertices[2]!)
  })

  test('should derive surface links for older grouped parts without stored attachments', () => {
    const mesh = {
      indices: [0, 1, 2],
      source: {kind: 'imported' as const, name: 'front.glb'},
      vertices: [0, 0, 4, 10, 0, 4, 0, 10, 4],
    }
    const legacyPart: PuppetPart = {
      ...part,
      spatial: {...part.spatial!, controlPoints: [0, 0, 7, 10, 0, 7, 0, 10, 7], groupId: 'spatial'},
    }
    const node = {
      bounds: {height: 10, width: 10, x: 0, y: 0},
      children: [{id: 'front', kind: 'part' as const, locked: false, name: 'Front', visible: true}],
      columns: 2,
      controlPoints: [0, 0, 10, 0, 0, 10, 10, 10],
      deformerType: 'spatial' as const,
      id: 'spatial',
      kind: 'deformer' as const,
      locked: false,
      name: '3D',
      rows: 2,
      spatialMesh: mesh,
      spatialOrigin: [0, 0, 0] as const,
      spatialRotation: [0, 90, 0] as const,
      spatialRotationParameterIds: [null, null, null] as const,
      visible: true,
    }
    const beforeDocument: PuppetDocument = {
      ...document,
      parts: [legacyPart],
      scene: {roots: [node]},
    }
    const moved = [...mesh.vertices]
    moved[2] += 6
    const afterDocument: PuppetDocument = {
      ...beforeDocument,
      scene: {roots: [{...node, spatialMesh: {...mesh, vertices: moved}}]},
    }
    const before = getSpatialPartPose({document: beforeDocument, part: legacyPart})!
    const after = getSpatialPartPose({document: afterDocument, part: legacyPart})!
    expect(after.vertices[0]! - before.vertices[0]!).toBeCloseTo(6)
    expect(legacyPart.spatial?.controlPoints[2]).toBe(7)
  })

  test('should show the front face at rest and cull it after a half turn', () => {
    expect(getSpatialPartPose({document, part})?.facing).toBe(true)
    expect(getSpatialPartPose({document, parameterValues: {turn: 180}, part})?.facing).toBe(false)
  })

  test('should reveal a separately textured side face at a quarter turn', () => {
    const side: PuppetPart = {
      ...part,
      id: 'side',
      spatial: {
        ...part.spatial!,
        controlPoints: [10, 0, 0, 10, 0, 4, 10, 10, 0],
      },
      texture: {height: 10, src: 'side.png', width: 4},
    }
    expect(getSpatialPartPose({document, part: side})?.facing).toBe(false)
    expect(getSpatialPartPose({document, parameterValues: {turn: 90}, part: side})?.facing).toBe(
      true,
    )
  })

  test('should use the shared 3D deformer rotation for its child surface', () => {
    const groupedPart: PuppetPart = {
      ...part,
      spatial: {...part.spatial!, groupId: 'spatial', rotationParameterIds: [null, null, null]},
    }
    const groupedDocument: PuppetDocument = {
      ...document,
      parts: [groupedPart],
      scene: {
        roots: [
          {
            bounds: {height: 10, width: 10, x: 0, y: 0},
            children: [{id: 'front', kind: 'part', locked: false, name: 'Front', visible: true}],
            columns: 2,
            controlPoints: [0, 0, 10, 0, 0, 10, 10, 10],
            deformerType: 'spatial',
            id: 'spatial',
            kind: 'deformer',
            locked: false,
            name: '3D',
            rows: 2,
            spatialOrigin: [0, 0, 0],
            spatialRotationParameterIds: [null, 'turn', null],
            visible: true,
          },
        ],
      },
    }
    expect(getSpatialPartPose({document: groupedDocument, part: groupedPart})?.facing).toBe(true)
    const parameterValues = {turn: 180}
    const posedScene = composeParameterScene(groupedDocument, parameterValues)
    expect(
      getSpatialPartPose({document: groupedDocument, parameterValues, part: groupedPart})?.facing,
    ).toBe(false)
    expect(
      getSpatialPartPose({
        document: groupedDocument,
        parameterValues,
        part: groupedPart,
        posedScene,
      })?.facing,
    ).toBe(false)
  })

  test('should include the deformer static rotation', () => {
    const groupedPart: PuppetPart = {
      ...part,
      spatial: {...part.spatial!, groupId: 'spatial'},
    }
    const groupedDocument: PuppetDocument = {
      ...document,
      parts: [groupedPart],
      scene: {
        roots: [
          {
            bounds: {height: 10, width: 10, x: 0, y: 0},
            children: [{id: 'front', kind: 'part', locked: false, name: 'Front', visible: true}],
            columns: 2,
            controlPoints: [0, 0, 10, 0, 0, 10, 10, 10],
            deformerType: 'spatial',
            id: 'spatial',
            kind: 'deformer',
            locked: false,
            name: '3D',
            rows: 2,
            spatialOrigin: [0, 0, 0],
            spatialRotation: [0, 180, 0],
            spatialRotationParameterIds: [null, null, null],
            visible: true,
          },
        ],
      },
    }
    expect(getSpatialPartPose({document: groupedDocument, part: groupedPart})?.facing).toBe(false)
  })

  test('should apply a connected parameter keyform to the shared 3D rotation', () => {
    const groupedPart: PuppetPart = {
      ...part,
      spatial: {...part.spatial!, groupId: 'spatial', rotationParameterIds: [null, null, null]},
    }
    const node = {
      bounds: {height: 10, width: 10, x: 0, y: 0},
      children: [{id: 'front', kind: 'part' as const, locked: false, name: 'Front', visible: true}],
      columns: 2,
      controlPoints: [0, 0, 10, 0, 0, 10, 10, 10],
      deformerType: 'spatial' as const,
      id: 'spatial',
      kind: 'deformer' as const,
      locked: false,
      name: '3D',
      rows: 2,
      spatialOrigin: [0, 0, 0] as const,
      spatialRotation: [0, 0, 0] as const,
      spatialRotationParameterIds: [null, null, null] as const,
      visible: true,
    }
    const groupedDocument: PuppetDocument = {
      ...document,
      parameterBindings: [
        {
          id: 'turn',
          keyforms: [
            {
              deformers: [
                {
                  controlPoints: node.controlPoints,
                  kind: 'deformer',
                  nodeId: node.id,
                  spatialRotation: [0, 0, 0],
                },
              ],
              parts: [],
              values: [0],
            },
            {
              deformers: [
                {
                  controlPoints: node.controlPoints,
                  kind: 'deformer',
                  nodeId: node.id,
                  spatialRotation: [0, 180, 0],
                },
              ],
              parts: [],
              values: [180],
            },
          ],
          parameterIds: ['turn'],
          targetDeformerIds: [node.id],
          targetPartIds: [],
        },
      ],
      parts: [groupedPart],
      scene: {roots: [node]},
    }

    expect(getSpatialPartPose({document: groupedDocument, part: groupedPart})?.facing).toBe(true)
    expect(
      getSpatialPartPose({
        document: groupedDocument,
        parameterValues: {turn: 180},
        part: groupedPart,
      })?.facing,
    ).toBe(false)
  })
})
