import {getDocumentScene} from '../scene'
import {rebindDeformer} from '../../deformation/binding'
import type {PuppetSceneDeformerNode} from '../document'
import {describe, expect, it, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'

describe('parseDocument scene validation', () => {
  test('should validate scene targets, uniqueness and complete part coverage', () => {
    const document = createDemoDocument()
    const firstNode = document.scene!.roots[0]!

    expect(
      parseDocument(JSON.stringify({...document, scene: {roots: [firstNode, {...firstNode}]}})),
    ).toEqual({error: {code: 'invalid-document'}, ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          scene: {roots: [{...firstNode, id: 'missing-part'}]},
        }),
      ),
    ).toEqual({error: {code: 'invalid-document'}, ok: false})
  })

  test('should accept a free-transform deformer and reject removed deformer kinds', () => {
    const document = createDemoDocument()
    const [firstNode, ...remainingNodes] = document.scene!.roots
    const deformer = {
      bounds: {height: 480, width: 640, x: 0, y: 0},
      children: [firstNode],
      columns: 1,
      controlPoints: [0, 0, 640, 0, 0, 480, 640, 480],
      id: 'deformer',
      kind: 'deformer',
      locked: false,
      name: 'Deformer',
      rotationOrigin: {x: 320, y: 240},
      rows: 1,
      visible: true,
    }
    const deformedDocument = {...document, scene: {roots: [deformer, ...remainingNodes]}}

    expect(parseDocument(JSON.stringify(deformedDocument))).toMatchObject({ok: true})
    expect(
      parseDocument(
        JSON.stringify({
          ...deformedDocument,
          scene: {
            roots: [{...deformer, rotationOrigin: {x: 'invalid', y: 240}}, ...remainingNodes],
          },
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...deformedDocument,
          scene: {
            roots: [
              {
                ...deformer,
                curveHandles: [
                  {
                    horizontal: {x: 200, y: 0},
                    pointIndex: 0,
                    vertical: {x: 0, y: 160},
                  },
                ],
              },
              ...remainingNodes,
            ],
          },
        }),
      ),
    ).toMatchObject({ok: true})
    expect(
      parseDocument(
        JSON.stringify({
          ...deformedDocument,
          scene: {
            roots: [
              {
                ...deformer,
                curveHandles: [
                  {
                    horizontal: {x: 200, y: 0},
                    pointIndex: 4,
                    vertical: {x: 0, y: 160},
                  },
                ],
              },
              ...remainingNodes,
            ],
          },
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...deformedDocument,
          scene: {roots: [{...deformer, kind: 'gridDeformer'}, ...remainingNodes]},
        }),
      ),
    ).toEqual({error: {code: 'invalid-document'}, ok: false})
  })

  it('should reject a document containing degenerate topology', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const invalidDocument = {
      ...document,
      parts: [{...part, mesh: {...part.mesh, indices: [0, 0, 1]}}],
    }

    expect(parseDocument(JSON.stringify(invalidDocument))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  })

  it('should derive explicit boundary loops when parsing legacy mesh data', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const legacyDocument = {
      ...document,
      parts: [
        {
          ...part,
          mesh: {indices: part.mesh.indices, uvs: part.mesh.uvs, vertices: part.mesh.vertices},
        },
      ],
      scene: undefined,
    }
    const result = parseDocument(JSON.stringify(legacyDocument))

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh.boundaryLoops).toEqual([[0, 1, 2, 3]])
    }
  })

  it('should reject boundary data that differs from the triangle exterior', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const invalidDocument = {
      ...document,
      parts: [{...part, mesh: {...part.mesh, boundaryLoops: [[0, 1, 4]]}}],
    }

    expect(parseDocument(JSON.stringify(invalidDocument))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  })

  it('should discard obsolete control vertex metadata', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const invalidDocument = {
      ...document,
      parts: [{...part, mesh: {...part.mesh, controlVertexIndices: [0, 0, 5]}}],
      scene: undefined,
    }

    const result = parseDocument(JSON.stringify(invalidDocument))

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh).not.toHaveProperty('controlVertexIndices')
    }
  })
})

test('should reject invalid curve axis and grid metadata', () => {
  const document = createDemoDocument()
  const root = {
    bounds: {height: 100, width: 100, x: 0, y: 0},
    children: [],
    columns: 1,
    controlPoints: [0, 50, 30, 50, 70, 50, 100, 50],
    curveAxis: 'x',
    id: 'curve',
    kind: 'deformer',
    locked: false,
    name: 'Curve',
    rows: 1,
    visible: true,
  }
  for (const change of [{curveAxis: 'z'}, {rows: 2}, {controlPoints: [0, 0]}, {curveHandles: []}]) {
    expect(
      parseDocument(JSON.stringify({...document, scene: {roots: [{...root, ...change}]}})).ok,
    ).toBe(false)
  }
})

test.each([
  {boneRestPoints: [0, 0, 0, 0]},
  {boneRestPoints: [0, 0, 10]},
  {boneRestPoints: [0, 0, Number.NaN, 10]},
  {boneRestPoints: [0, 0]},
])('should reject malformed bone bind coordinates $boneRestPoints', ({boneRestPoints}) => {
  const document = createDemoDocument()
  const node = {
    boneRestPoints,
    bounds: {height: 100, width: 100, x: 0, y: 0},
    children: [],
    columns: 1,
    controlPoints: boneRestPoints,
    id: 'bone',
    kind: 'deformer',
    locked: false,
    name: 'Bone',
    rows: 1,
    visible: true,
  }
  expect(parseDocument(JSON.stringify({...document, scene: {roots: [node]}})).ok).toBe(false)
})

test('should validate persisted deformer placement shapes and reject malformed reference steps', () => {
  const shape: PuppetSceneDeformerNode = {
    bounds: {height: 100, width: 100, x: 0, y: 0},
    children: getDocumentScene(createDemoDocument()).roots,
    columns: 1,
    controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
    id: 'grid',
    kind: 'deformer',
    locked: false,
    name: 'Grid',
    rows: 1,
    visible: true,
  }
  const node = rebindDeformer(shape, {
    ...shape,
    controlPoints: shape.controlPoints.map((value) => value + 10),
  })
  const document = {...createDemoDocument(), scene: {roots: [node]}}
  const parsed = parseDocument(serializeDocument(document))
  expect(parsed.ok).toBe(true)
  if (parsed.ok) {
    expect(parsed.document.scene?.roots[0]).toEqual(JSON.parse(JSON.stringify(node)))
  }
  for (const binding of [
    {rest: node.binding!.rest, steps: []},
    {rest: {...node.binding!.rest, controlPoints: [0]}, steps: node.binding!.steps},
    {rest: node.binding!.rest, steps: [{shape: {...shape, bounds: {...shape.bounds, width: 0}}}]},
    {rest: node.binding!.rest, steps: [{rest: {}, shape}]},
  ]) {
    expect(
      parseDocument(JSON.stringify({...document, scene: {roots: [{...node, binding}]}})).ok,
    ).toBe(false)
  }
})
