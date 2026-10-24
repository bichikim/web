import {describe, expect, test} from 'vitest'

import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import {rebindDeformer} from '../../../deformation/binding'
import {applySceneNodeDeformers} from '../../../deformation/vertices'
import {
  parseDocumentValue,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPart,
  type PuppetSceneNode,
} from '../../../player'
import {flipSceneNodes} from '../flip-nodes'
import {mirrorCoordinates} from '../mirror-geometry'

const part = (id: string, vertices: number[]): PuppetPart => ({
  id,
  mesh: {indices: [0, 1, 2, 0, 2, 3], uvs: [0, 0, 1, 0, 1, 1, 0, 1], vertices},
  properties: {culling: true},
  texture: {height: 1, src: `${id}.png`, width: 1},
})
const partNode = (id: string): PuppetSceneNode => ({
  id,
  kind: 'part',
  locked: false,
  name: id,
  visible: true,
})
const grid = (x: number, y: number, size: number) =>
  [0, 1, 2].flatMap((row) =>
    [0, 1, 2].flatMap((column) => [x + (column * size) / 2, y + (row * size) / 2]),
  )

/**
 * A 2×2 warp grid with curve handles holding a quad and a rotation deformer with its own quad;
 * one parameter bends the grid and moves a handle, another turns the rotation deformer.
 */
const createDocument = (): PuppetDocument => {
  const rest = grid(10, 10, 60)
  const bent = rest.map((value, index) => value + (index === 8 ? 12 : index === 9 ? -6 : 0))
  const handles = (offset: number) => [
    {horizontal: {x: 50 + offset, y: 8}, pointIndex: 4, vertical: {x: 42, y: 52}},
    {horizontal: {x: 22, y: 12}, pointIndex: 0, vertical: {x: 10, y: 24 + offset}},
  ]
  const rotation = [40, 40, 55, 40]
  const turned = [40, 40, 40, 55]
  return {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [],
    parameterBindings: [
      {
        id: 'bend',
        keyforms: [
          {
            deformers: [
              {controlPoints: rest, curveHandles: handles(0), kind: 'deformer', nodeId: 'warp'},
            ],
            parts: [{partId: 'skin', vertices: []}],
            values: [0],
          },
          {
            deformers: [
              {controlPoints: bent, curveHandles: handles(9), kind: 'deformer', nodeId: 'warp'},
            ],
            parts: [{partId: 'skin', vertices: [20, 20, 45, 22, 46, 48, 18, 44]}],
            values: [1],
          },
        ],
        parameterIds: ['bend'],
        targetDeformerIds: ['warp'],
        targetPartIds: ['skin'],
      },
      {
        id: 'turn',
        keyforms: [
          {
            deformers: [{controlPoints: rotation, kind: 'deformer', nodeId: 'rot'}],
            parts: [],
            values: [0],
          },
          {
            deformers: [{controlPoints: turned, kind: 'deformer', nodeId: 'rot'}],
            parts: [],
            values: [1],
          },
        ],
        parameterIds: ['turn'],
        targetDeformerIds: ['rot'],
        targetPartIds: [],
      },
    ],
    parameters: [
      {defaultValue: 0, id: 'bend', maximum: 1, minimum: 0, name: 'Bend'},
      {defaultValue: 0, id: 'turn', maximum: 1, minimum: 0, name: 'Turn'},
    ],
    parts: [
      part('skin', [20, 20, 45, 20, 45, 45, 20, 45]),
      part('arm', [45, 35, 62, 35, 62, 45, 45, 45]),
    ],
    scene: {
      roots: [
        {
          bounds: {height: 60, width: 60, x: 10, y: 10},
          children: [
            partNode('skin'),
            {
              boneRestPoints: rotation,
              bounds: {height: 30, width: 30, x: 35, y: 30},
              children: [partNode('arm')],
              columns: 1,
              controlPoints: rotation,
              deformerType: 'rotation',
              id: 'rot',
              kind: 'deformer',
              locked: false,
              name: 'Rot',
              rows: 1,
              visible: true,
            },
          ],
          columns: 2,
          controlPoints: rest,
          curveHandles: handles(0),
          id: 'warp',
          kind: 'deformer',
          locked: false,
          name: 'Warp',
          rows: 2,
          visible: true,
        },
      ],
    },
    version: PUPPET_DOCUMENT_VERSION,
    viewport: {height: 100, width: 100},
  }
}

const pose = (document: PuppetDocument, values: Readonly<Record<string, number>>) => {
  const vertices = new Map(
    document.parts.map((candidate) => [
      candidate.id,
      [
        ...composeParameterVertices({
          document,
          parameterValues: values,
          partId: candidate.id,
          restVertices: candidate.mesh.vertices,
        }),
      ],
    ]),
  )
  applySceneNodeDeformers(composeParameterScene(document, values).roots, vertices)
  return vertices
}

const signedAreas = (document: PuppetDocument) =>
  document.parts.flatMap(({mesh}) =>
    Array.from({length: mesh.indices.length / 3}, (_, triangle) => {
      const [first, second, third] = [0, 1, 2].map((corner) => mesh.indices[triangle * 3 + corner]!)
      const at = (index: number, offset: number) => mesh.vertices[index * 2 + offset]!
      return Math.sign(
        (at(second!, 0) - at(first!, 0)) * (at(third!, 1) - at(first!, 1)) -
          (at(third!, 0) - at(first!, 0)) * (at(second!, 1) - at(first!, 1)),
      )
    }),
  )

describe('flipSceneNodes', () => {
  test.each([
    ['x', 'selection'],
    ['y', 'selection'],
    ['x', 'canvas'],
  ] as const)('should pose as the mirror image of the original (%s, %s)', (axis, reference) => {
    const document = createDocument()
    expect(parseDocumentValue(document).ok).toBe(true)
    const result = flipSceneNodes({axis, document, nodeIds: ['warp'], reference})
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(parseDocumentValue(result.document).ok).toBe(true)
    const center = reference === 'canvas' ? 50 : 40
    const valueSets: ReadonlyArray<Record<string, number>> = [
      {},
      {bend: 1},
      {bend: 0.4, turn: 0.7},
      {turn: 1},
    ]
    for (const values of valueSets) {
      const original = pose(document, values)
      const flipped = pose(result.document, values)
      for (const [partId, vertices] of original) {
        const expected = mirrorCoordinates(vertices, {axis, center})
        flipped
          .get(partId)!
          .forEach((value, index) =>
            expect(value, `${partId} ${JSON.stringify(values)}`).toBeCloseTo(expected[index]!, 9),
          )
      }
    }
    // Triangles keep facing the viewer, so culled parts stay visible.
    expect(signedAreas(result.document)).toEqual(signedAreas(document))
  })

  test('should mirror binding layouts and pin deformers', () => {
    const corners = (x: number, y: number, size: number) => [
      x,
      y,
      x + size,
      y,
      x,
      y + size,
      x + size,
      y + size,
    ]
    const warp = {
      bounds: {height: 40, width: 40, x: 10, y: 10},
      children: [],
      columns: 1,
      controlPoints: corners(10, 10, 40),
      id: 'warp',
      kind: 'deformer',
      locked: false,
      name: 'Warp',
      rows: 1,
      visible: true,
    } as const
    // Re-laid out after its contents were placed: the old layout is kept as a binding step.
    const rebound = rebindDeformer(warp, {...warp, controlPoints: [12, 8, 52, 14, 8, 50, 46, 54]})
    const pin = {
      bounds: {height: 20, width: 20, x: 20, y: 20},
      children: [partNode('arm')],
      columns: 1,
      controlPoints: [24, 30],
      id: 'pin',
      kind: 'deformer',
      locked: false,
      name: 'Pin',
      pins: [{radius: 15, strength: 1, x: 24, y: 30}],
      rows: 1,
      visible: true,
    } as const
    const document: PuppetDocument = {
      format: PUPPET_DOCUMENT_FORMAT,
      motions: [],
      parameterBindings: [
        {
          id: 'pull',
          keyforms: [0, 1].map((value) => ({
            deformers: [
              {
                controlPoints: [12, 8, 52 + value * 6, 14, 8, 50, 46, 54],
                kind: 'deformer',
                nodeId: 'warp',
              },
              {controlPoints: [24 + value * 5, 30 - value * 3], kind: 'deformer', nodeId: 'pin'},
            ],
            parts: [],
            values: [value],
          })),
          parameterIds: ['pull'],
          targetDeformerIds: ['warp', 'pin'],
          targetPartIds: [],
        },
      ],
      parameters: [{defaultValue: 0, id: 'pull', maximum: 1, minimum: 0, name: 'Pull'}],
      parts: [
        part('skin', [15, 15, 45, 15, 45, 45, 15, 45]),
        part('arm', [25, 25, 35, 25, 35, 35, 25, 35]),
      ],
      scene: {roots: [{...rebound, children: [partNode('skin'), pin]}]},
      version: PUPPET_DOCUMENT_VERSION,
      viewport: {height: 60, width: 60},
    }
    expect(parseDocumentValue(document).ok).toBe(true)
    const result = flipSceneNodes({axis: 'x', document, nodeIds: ['warp'], reference: 'canvas'})
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(parseDocumentValue(result.document).ok).toBe(true)
    for (const values of [{}, {pull: 1}] as ReadonlyArray<Record<string, number>>) {
      const original = pose(document, values)
      for (const [partId, vertices] of pose(result.document, values)) {
        const expected = mirrorCoordinates(original.get(partId)!, {axis: 'x', center: 30})
        vertices.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 9))
      }
    }
  })

  test('should mirror motion vertex tracks of flipped parts on the flipped axis', () => {
    const track = (partId: string, axis: 'x' | 'y', value: number) => ({
      axis,
      keyframes: [
        {time: 0, value},
        {time: 1, value: value + 4},
      ],
      kind: 'vertex' as const,
      partId,
      vertexIndex: 1,
    })
    const document: PuppetDocument = {
      ...createDocument(),
      motions: [
        {
          duration: 1,
          id: 'wave',
          tracks: [track('arm', 'x', 62), track('arm', 'y', 35), track('skin', 'x', 45)],
        },
      ],
    }
    expect(parseDocumentValue(document).ok).toBe(true)
    const result = flipSceneNodes({axis: 'x', document, nodeIds: ['rot'], reference: 'canvas'})
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(
      result.document.motions[0]!.tracks.map((candidate) =>
        candidate.keyframes.map((keyframe) => keyframe.value),
      ),
    ).toEqual([
      [38, 34],
      [35, 39],
      [45, 49],
    ])
    expect(parseDocumentValue(result.document).ok).toBe(true)
  })

  test('should reflect the bezier handles of mirrored vertex curves', () => {
    const document: PuppetDocument = {
      ...createDocument(),
      motions: [
        {
          duration: 1,
          id: 'wave',
          tracks: [
            {
              axis: 'x',
              keyframes: [
                {bezier: [0.25, 62, 0.75, 66], easing: 'bezier', time: 0, value: 62},
                {time: 1, value: 66},
              ],
              kind: 'vertex',
              partId: 'arm',
              vertexIndex: 1,
            },
          ],
        },
      ],
    }
    const result = flipSceneNodes({axis: 'x', document, nodeIds: ['rot'], reference: 'canvas'})
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(result.document.motions[0]!.tracks[0]!.keyframes[0]).toEqual({
      bezier: [0.25, 38, 0.75, 34],
      easing: 'bezier',
      time: 0,
      value: 38,
    })
  })

  test('should refuse locked, 3D and curve layers', () => {
    const document = createDocument()
    const locked = {
      ...document,
      scene: {roots: [{...document.scene!.roots[0]!, locked: true}]},
    } as PuppetDocument
    const result = flipSceneNodes({
      axis: 'x',
      document: locked,
      nodeIds: ['skin'],
      reference: 'selection',
    })
    expect(result).toEqual({message: '잠긴 레이어가 있어 반전할 수 없습니다.', ok: false})
  })
})
