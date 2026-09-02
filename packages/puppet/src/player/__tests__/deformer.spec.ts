import {describe, expect, test} from 'vitest'

import {
  applySceneDeformers,
  createDeformerControlPoints,
  createDeformerCurveHandle,
  unapplySceneDeformersPoint,
} from '../deformer'
import {createDemoDocument} from '../create-demo-document'
import type {PuppetDocument, PuppetSceneDeformerNode, PuppetSceneNode} from '../document'

const createDocument = (root: PuppetSceneNode): PuppetDocument => ({
  ...createDemoDocument(),
  scene: {roots: [root]},
})

const partNode: PuppetSceneNode = {
  id: 'mesh-preview',
  kind: 'part',
  locked: false,
  name: 'Part',
  visible: true,
}

const createDeformer = (
  options: Pick<PuppetSceneDeformerNode, 'controlPoints' | 'id'> & {
    readonly children?: ReadonlyArray<PuppetSceneNode>
  },
): PuppetSceneDeformerNode => ({
  bounds: {height: 100, width: 100, x: 0, y: 0},
  children: options.children ?? [partNode],
  columns: 1,
  controlPoints: options.controlPoints,
  id: options.id,
  kind: 'deformer',
  locked: false,
  name: 'Deformer',
  rows: 1,
  visible: true,
})

describe('applySceneDeformers', () => {
  test('should apply a rigid transform represented by control points', () => {
    const document = createDocument(
      createDeformer({controlPoints: [25, -15, 25, 185, -75, -15, -75, 185], id: 'deformer'}),
    )
    const vertices = [20, 10, 10, 20]

    applySceneDeformers({document, verticesByPartId: new Map([['mesh-preview', vertices]])})

    expect(vertices[0]).toBeCloseTo(15)
    expect(vertices[1]).toBeCloseTo(25)
    expect(vertices[2]).toBeCloseTo(5)
    expect(vertices[3]).toBeCloseTo(5)
  })

  test('should interpolate control points and extrapolate outside its bounds', () => {
    const deformer = createDeformer({
      controlPoints: [0, 0, 100, 0, 0, 100, 150, 150],
      id: 'deformer',
    })
    const vertices = [50, 50, 100, 100, 150, 100]

    applySceneDeformers({
      document: createDocument(deformer),
      verticesByPartId: new Map([['mesh-preview', vertices]]),
    })

    expect(vertices).toEqual([62.5, 62.5, 150, 150, 225, 175])
  })

  test('should curve only segments with an optional curve handle', () => {
    const deformer = {
      ...createDeformer({
        controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
        id: 'deformer',
      }),
      curveHandles: [
        {
          horizontal: {x: 100 / 3, y: 50},
          pointIndex: 0,
          vertical: {x: 0, y: 100 / 3},
        },
      ],
    }
    const vertices = [50, 0, 50, 100]

    applySceneDeformers({
      document: createDocument(deformer),
      verticesByPartId: new Map([['mesh-preview', vertices]]),
    })

    expect(vertices[0]).toBeCloseTo(50)
    expect(vertices[1]).toBeCloseTo(18.75)
    expect(vertices[2]).toBeCloseTo(50)
    expect(vertices[3]).toBeCloseTo(100)
  })

  test('should apply child deformation before its parent deformation', () => {
    const child = createDeformer({
      controlPoints: [10, 0, 110, 0, 10, 100, 110, 100],
      id: 'child',
    })
    const parent = createDeformer({
      children: [child],
      controlPoints: [0, 0, 0, 100, -100, 0, -100, 100],
      id: 'parent',
    })
    const vertices = [0, 0]

    applySceneDeformers({
      document: createDocument(parent),
      verticesByPartId: new Map([['mesh-preview', vertices]]),
    })

    expect(vertices[0]).toBeCloseTo(0)
    expect(vertices[1]).toBeCloseTo(10)
  })

  test('should restore a point through nested deformers', () => {
    const child = createDeformer({
      controlPoints: [0, 0, 120, 10, -10, 100, 130, 120],
      id: 'child',
    })
    const parent = createDeformer({
      children: [child],
      controlPoints: [25, -15, 25, 105, -55, -15, -55, 105],
      id: 'parent',
    })
    const document = createDocument(parent)
    const vertices = [35, 65]

    applySceneDeformers({document, verticesByPartId: new Map([['mesh-preview', vertices]])})
    const restored = unapplySceneDeformersPoint({
      document,
      partId: 'mesh-preview',
      point: {x: vertices[0]!, y: vertices[1]!},
    })

    expect(restored.x).toBeCloseTo(35, 5)
    expect(restored.y).toBeCloseTo(65, 5)
  })
})

describe('createDeformerControlPoints', () => {
  test('should create a row-major control lattice over the bounds', () => {
    expect(
      createDeformerControlPoints({
        bounds: {height: 20, width: 20, x: 10, y: 30},
        columns: 2,
        rows: 1,
      }),
    ).toEqual([10, 30, 20, 30, 30, 30, 10, 50, 20, 50, 30, 50])
  })

  test('should create a neutral curve handle for a selected grid point', () => {
    const deformer = createDeformer({
      controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
      id: 'deformer',
    })

    expect(createDeformerCurveHandle(deformer, 0)).toEqual({
      horizontal: {x: 100 / 3, y: 0},
      pointIndex: 0,
      vertical: {x: 0, y: 100 / 3},
    })
  })
})
