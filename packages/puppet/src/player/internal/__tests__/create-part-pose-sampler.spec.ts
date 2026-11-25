import {expect, test} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createPartPoseSampler} from '../create-part-pose-sampler'
import type {PuppetDocument, PuppetSceneDeformerNode} from '../../document'
test('should sample a weighted part attached to a separate rotation bone', () => {
  const identity = {x: 0, xx: 1, xy: 0, y: 0, yx: 0, yy: 1}
  const rotation: PuppetSceneDeformerNode = {
    boneRestPoints: [0, 0, 1, 0],
    bounds: {height: 1, width: 1, x: 0, y: 0},
    children: [],
    columns: 1,
    controlPoints: [0, 0, 1, 0],
    coordinateSpace: 'parent',
    deformerType: 'rotation',
    id: 'bone',
    kind: 'deformer',
    locked: false,
    name: 'Bone',
    rotationAngle: 0,
    rows: 1,
    visible: true,
  }
  const document: PuppetDocument = {
    ...createEmptyDocument(),
    parameterBindings: [
      {
        id: 'pose',
        interpolation: 'grid',
        keyforms: [0, 1].map((value) => ({
          deformers: [
            {
              controlPoints: [
                0,
                0,
                Math.cos((value * Math.PI) / 2),
                Math.sin((value * Math.PI) / 2),
              ],
              kind: 'deformer',
              nodeId: 'bone',
              rotationAngle: (value * Math.PI) / 2,
            },
          ],
          parts: [],
          values: [value],
        })),
        parameterIds: ['rotate'],
        targetDeformerIds: ['bone'],
      },
    ],
    parameters: [{defaultValue: 0, id: 'rotate', maximum: 1, minimum: 0, name: 'Rotate'}],
    parts: [
      {
        id: 'skin',
        mesh: {
          indices: [0, 1, 2, 0, 2, 3],
          uvs: [0, 0, 1, 0, 1, 1, 0, 1],
          vertices: [10, 0, 20, 0, 20, 10, 10, 10],
        },
        texture: {height: 1, src: 'data:image/png;base64,', width: 1},
      },
    ],
    scene: {
      roots: [
        rotation,
        {
          id: 'skin',
          kind: 'part',
          locked: false,
          name: 'Skin',
          skinning: {
            bind: identity,
            influences: [{inverseBind: identity, nodeId: 'bone', weights: [1, 1, 1, 1]}],
          },
          visible: true,
        },
      ],
    },
  }
  const sample = createPartPoseSampler({
    document,
    partId: 'skin',
    point: {x: 15, y: 5},
    vertices: document.parts[0]!.mesh.vertices,
  })
  expect(sample).toBeDefined()
  expect(sample!({rotate: 0})).toMatchObject({x: 15, y: 5})
  const moved = sample!({rotate: 1})
  expect(moved.x).toBeCloseTo(-5)
  expect(moved.y).toBeCloseTo(15)
})
