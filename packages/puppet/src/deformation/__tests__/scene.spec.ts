import {createSkinDocument} from './fixtures/skin'
import {composeParameterScene} from '../scene'
import {applySceneNodeDeformers} from '../vertices'
import type {PuppetDocument} from '../../player/document'
import {expect, test} from 'vitest'

import type {PuppetParameterBinding1D, PuppetSceneDeformerNode} from '../../player/document'
import {sampleParameterDeformer} from '../scene'
import {transformDeformerPoint} from '../grid'

test('should interpolate curve handles through parameter keyforms', () => {
  const node: PuppetSceneDeformerNode = {
    bounds: {height: 20, width: 90, x: 0, y: 0},
    children: [],
    columns: 1,
    controlPoints: [0, 10, 30, 10, 60, 10, 90, 10],
    curveAxis: 'x',
    id: 'curve',
    kind: 'deformer',
    locked: false,
    name: 'Curve',
    rows: 1,
    visible: true,
  }
  const binding: PuppetParameterBinding1D = {
    id: 'binding',
    keyforms: [
      {
        deformers: [{controlPoints: node.controlPoints, kind: 'deformer', nodeId: 'curve'}],
        parts: [],
        values: [0],
      },
      {
        deformers: [
          {controlPoints: [0, 10, 30, 50, 60, 50, 90, 10], kind: 'deformer', nodeId: 'curve'},
        ],
        parts: [],
        values: [1],
      },
    ],
    parameterIds: ['bend'],
    targetDeformerIds: ['curve'],
    targetPartIds: [],
  }
  const sampled = sampleParameterDeformer({binding, deformer: node, values: [0.5]})
  const result = transformDeformerPoint(
    {...node, controlPoints: sampled.controlPoints},
    {x: 45, y: 10},
  )
  expect(result).toEqual({x: 45, y: 25})
})

test('should preserve bone lengths in sampled keyforms', () => {
  const node: PuppetSceneDeformerNode = {
    id: 'bone',
    children: [],
    kind: 'deformer',
    columns: 1,
    locked: false,
    boneRestPoints: [0, 0, 50, 0, 100, 0],
    name: 'Bone',
    bounds: {x: 0, width: 100, y: 0, height: 100},
    visible: true,
    controlPoints: [0, 0, 50, 0, 100, 0],
    rows: 1,
  }
  const binding: PuppetParameterBinding1D = {
    id: 'bend',
    keyforms: [
      {
        parts: [],
        values: [0],
        deformers: [{kind: 'deformer', controlPoints: node.controlPoints, nodeId: 'bone'}],
      },
      {
        parts: [],
        values: [1],
        deformers: [{kind: 'deformer', controlPoints: [0, 0, 0, 50, 0, 100], nodeId: 'bone'}],
      },
    ],
    parameterIds: ['bend'],
    targetDeformerIds: ['bone'],
    targetPartIds: [],
  }
  const sampled = sampleParameterDeformer({binding, deformer: node, values: [0.5]})
  expect(Math.hypot(sampled.controlPoints[2]!, sampled.controlPoints[3]!)).toBeCloseTo(50)
  expect(
    Math.hypot(
      sampled.controlPoints[4]! - sampled.controlPoints[2]!,
      sampled.controlPoints[5]! - sampled.controlPoints[3]!,
    ),
  ).toBeCloseTo(50)
  const point = transformDeformerPoint(
    {...node, controlPoints: sampled.controlPoints},
    {x: 100, y: 0},
  )
  expect(point.x).toBeCloseTo(Math.SQRT1_2 * 100)
  expect(point.y).toBeCloseTo(Math.SQRT1_2 * 100)
})

test('should interpolate a half-turn bone pose without collapsing or snapping at the midpoint', () => {
  const node: PuppetSceneDeformerNode = {
    id: 'bone',
    kind: 'deformer',
    children: [],
    locked: false,
    columns: 1,
    name: 'Bone',
    boneRestPoints: [0, 0, 100, 0],
    visible: true,
    bounds: {x: 0, width: 100, y: 0, height: 100},
    rows: 1,
    controlPoints: [0, 0, 100, 0],
  }
  const binding: PuppetParameterBinding1D = {
    id: 'bend',
    keyforms: [
      {
        values: [0],
        parts: [],
        deformers: [{kind: 'deformer', nodeId: 'bone', controlPoints: node.controlPoints}],
      },
      {
        values: [1],
        parts: [],
        deformers: [{kind: 'deformer', nodeId: 'bone', controlPoints: [0, 0, -100, 0]}],
      },
    ],
    parameterIds: ['bend'],
    targetDeformerIds: ['bone'],
    targetPartIds: [],
  }
  const sampled = sampleParameterDeformer({binding, deformer: node, values: [0.5]})
  expect(sampled.controlPoints[2]).toBeCloseTo(0)
  expect(Math.abs(sampled.controlPoints[3]!)).toBeCloseTo(100)
})

test('should interpolate rotation keyforms on a circular arc around the pivot', () => {
  const node: PuppetSceneDeformerNode = {
    bounds: {x: 10, y: 20, width: 100, height: 100},
    children: [],
    columns: 1,
    controlPoints: [10, 20, 110, 20],
    boneRestPoints: [10, 20, 110, 20],
    deformerType: 'rotation',
    id: 'rotation',
    kind: 'deformer',
    locked: false,
    name: 'Rotation',
    rows: 1,
    visible: true,
  }
  const binding: PuppetParameterBinding1D = {
    id: 'turn',
    parameterIds: ['turn'],
    targetPartIds: [],
    targetDeformerIds: ['rotation'],
    keyforms: [
      {
        values: [0],
        parts: [],
        deformers: [{nodeId: 'rotation', kind: 'deformer', controlPoints: node.controlPoints}],
      },
      {
        values: [1],
        parts: [],
        deformers: [{nodeId: 'rotation', kind: 'deformer', controlPoints: [10, 20, 10, 120]}],
      },
    ],
  }
  const sampled = sampleParameterDeformer({binding, deformer: node, values: [0.5]})
  const point = transformDeformerPoint(
    {...node, controlPoints: sampled.controlPoints},
    {x: 110, y: 20},
  )
  expect(point.x).toBeCloseTo(10 + 100 * Math.SQRT1_2)
  expect(point.y).toBeCloseTo(20 + 100 * Math.SQRT1_2)
})

test('should drive skinning from sampled rotation keyforms', () => {
  const document = createSkinDocument()
  const animated: PuppetDocument = {
    ...document,
    parameters: [{id: 'turn', name: 'Turn', defaultValue: 0, minimum: 0, maximum: 1}],
    parameterBindings: [
      {
        id: 'turn-binding',
        parameterIds: ['turn'],
        targetDeformerIds: ['Shoulder'],
        keyforms: [
          {
            values: [0],
            parts: [],
            deformers: [{kind: 'deformer', nodeId: 'Shoulder', controlPoints: [0, 0, 50, 0]}],
          },
          {
            values: [1],
            parts: [],
            deformers: [{kind: 'deformer', nodeId: 'Shoulder', controlPoints: [0, 0, 0, 50]}],
          },
        ],
      },
    ],
  }
  const partId = document.parts[0]!.id
  const scene = composeParameterScene(animated, {turn: 1})
  const vertices = new Map([[partId, [...document.parts[0]!.mesh.vertices]]])
  applySceneNodeDeformers(scene.roots, vertices)
  const part = scene.roots.find((node) => node.id === partId)
  if (part?.kind !== 'part' || part.skinning === undefined) {
    throw new Error('Missing skin')
  }
  const weight = part.skinning.influences[0]!.weights[1]!
  const x = document.parts[0]!.mesh.vertices[2]!
  const y = document.parts[0]!.mesh.vertices[3]!
  const angle = 2 * Math.atan2(weight * Math.SQRT1_2, 1 - weight + weight * Math.SQRT1_2)
  expect(vertices.get(partId)![2]).toBeCloseTo(x * Math.cos(angle) - y * Math.sin(angle))
  expect(vertices.get(partId)![3]).toBeCloseTo(y * Math.cos(angle) + x * Math.sin(angle))
})
