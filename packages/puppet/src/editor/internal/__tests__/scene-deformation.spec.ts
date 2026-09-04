import {expect, test} from 'vitest'

import {
  createDemoDocument,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
  type PuppetSceneNode,
} from '../../../player'
import {applySceneDeformers, unapplySceneDeformersPoint} from '../scene-deformation'

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
  const document: PuppetDocument = {...createDemoDocument(), scene: {roots: [parent]}}
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
