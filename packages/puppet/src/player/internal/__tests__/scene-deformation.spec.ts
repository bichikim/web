import {rebindDeformer} from '../../../deformation/binding'
import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../create-demo-document'
import type {PuppetDocument, PuppetSceneDeformerNode, PuppetSceneNode} from '../../document'
import {applySceneDeformers} from '../scene-deformation'

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
})

test('should deform player vertices along a cubic centerline', () => {
  const curve: PuppetSceneDeformerNode = {
    ...createDeformer({controlPoints: [0, 50, 100 / 3, 90, 200 / 3, 90, 100, 50], id: 'curve'}),
    curveAxis: 'x',
  }
  const vertices = [50, 50, 50, 60]
  applySceneDeformers({
    document: createDocument(curve),
    verticesByPartId: new Map([['mesh-preview', vertices]]),
  })
  expect(vertices).toEqual([50, 80, 50, 90])
})

test('should preserve nested deformer output when rebinding either parent or child', () => {
  const child = createDeformer({controlPoints: [10, 20, 110, 20, 10, 120, 110, 120], id: 'child'})
  const parent = createDeformer({
    children: [child],
    controlPoints: [50, 0, 50, 100, -50, 0, -50, 100],
    id: 'parent',
  })
  const source = [20, 10, 10, 20, 60, 70]
  const expected = [...source]
  applySceneDeformers({
    document: createDocument(parent),
    verticesByPartId: new Map([['mesh-preview', expected]]),
  })
  const movedChild = rebindDeformer(child, {
    ...child,
    controlPoints: child.controlPoints.map((value) => value + 20),
  })
  const movedParent = rebindDeformer(parent, {
    ...parent,
    children: [movedChild],
    controlPoints: parent.controlPoints.map((value) => value + 30),
  })
  const actual = [...source]
  applySceneDeformers({
    document: createDocument(movedParent),
    verticesByPartId: new Map([['mesh-preview', actual]]),
  })
  expect(actual).toEqual(expected)
})
