import {createSkinDocument} from './fixtures/skin'
import {composeParameterScene, sampleParameterDeformer} from '../scene'
import {applySceneNodeDeformers} from '../vertices'
import type {
  PuppetDocument,
  PuppetParameterBinding1D,
  PuppetSceneDeformerNode,
} from '../../player/document'
import {expect, test} from 'vitest'

import {transformDeformerPoint} from '../grid'

test('should interpolate spatial deformer transforms and mesh position through parameter keyforms', () => {
  const node: PuppetSceneDeformerNode = {
    bounds: {height: 10, width: 10, x: 0, y: 0},
    children: [],
    columns: 1,
    controlPoints: [0, 0, 10, 0, 0, 10, 10, 10],
    deformerType: 'spatial',
    id: 'spatial',
    kind: 'deformer',
    locked: false,
    name: '3D',
    rows: 1,
    spatialMeshPosition: [0, 0, 0],
    spatialOrigin: [5, 5, 0],
    spatialRotation: [0, 0, 0],
    spatialScale: [1, 1, 1],
    spatialTranslation: [0, 0, 0],
    visible: true,
  }
  const document: PuppetDocument = {
    format: 'winter-love-puppet',
    motions: [],
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
                spatialMeshPosition: [0, 0, 0],
                spatialOrigin: [5, 5, 0],
                spatialRotation: [0, 0, 0],
                spatialScale: [1, 1, 1],
                spatialTranslation: [0, 0, 0],
              },
            ],
            parts: [],
            values: [-30],
          },
          {
            deformers: [
              {
                controlPoints: node.controlPoints,
                kind: 'deformer',
                nodeId: node.id,
                spatialMeshPosition: [20, -10, 6],
                spatialOrigin: [5, 5, 10],
                spatialRotation: [0, 90, 0],
                spatialScale: [2, 3, 4],
                spatialTranslation: [20, -10, 6],
              },
            ],
            parts: [],
            values: [30],
          },
        ],
        parameterIds: ['turn'],
        targetDeformerIds: [node.id],
        targetPartIds: [],
      },
    ],
    parameters: [{defaultValue: -30, id: 'turn', maximum: 30, minimum: -30, name: 'Turn'}],
    parts: [],
    scene: {roots: [node]},
    version: 1,
    viewport: {height: 100, width: 100},
  }
  const sampled = composeParameterScene(document, {turn: 0}).roots[0]

  expect(sampled?.kind === 'deformer' ? sampled.spatialRotation : undefined).toEqual([0, 45, 0])
  expect(sampled?.kind === 'deformer' ? sampled.spatialOrigin : undefined).toEqual([5, 5, 5])
  expect(sampled?.kind === 'deformer' ? sampled.spatialMeshPosition : undefined).toEqual([
    10, -5, 3,
  ])
  expect(sampled?.kind === 'deformer' ? sampled.spatialScale : undefined).toEqual([1.5, 2, 2.5])
  expect(sampled?.kind === 'deformer' ? sampled.spatialTranslation : undefined).toEqual([10, -5, 3])
})

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
    boneRestPoints: [0, 0, 50, 0, 100, 0],
    bounds: {height: 100, width: 100, x: 0, y: 0},
    children: [],
    columns: 1,
    controlPoints: [0, 0, 50, 0, 100, 0],
    id: 'bone',
    kind: 'deformer',
    locked: false,
    name: 'Bone',
    rows: 1,
    visible: true,
  }
  const binding: PuppetParameterBinding1D = {
    id: 'bend',
    keyforms: [
      {
        deformers: [{controlPoints: node.controlPoints, kind: 'deformer', nodeId: 'bone'}],
        parts: [],
        values: [0],
      },
      {
        deformers: [{controlPoints: [0, 0, 0, 50, 0, 100], kind: 'deformer', nodeId: 'bone'}],
        parts: [],
        values: [1],
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
    boneRestPoints: [0, 0, 100, 0],
    bounds: {height: 100, width: 100, x: 0, y: 0},
    children: [],
    columns: 1,
    controlPoints: [0, 0, 100, 0],
    id: 'bone',
    kind: 'deformer',
    locked: false,
    name: 'Bone',
    rows: 1,
    visible: true,
  }
  const binding: PuppetParameterBinding1D = {
    id: 'bend',
    keyforms: [
      {
        deformers: [{controlPoints: node.controlPoints, kind: 'deformer', nodeId: 'bone'}],
        parts: [],
        values: [0],
      },
      {
        deformers: [{controlPoints: [0, 0, -100, 0], kind: 'deformer', nodeId: 'bone'}],
        parts: [],
        values: [1],
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
    boneRestPoints: [10, 20, 110, 20],
    bounds: {height: 100, width: 100, x: 10, y: 20},
    children: [],
    columns: 1,
    controlPoints: [10, 20, 110, 20],
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
    keyforms: [
      {
        deformers: [{controlPoints: node.controlPoints, kind: 'deformer', nodeId: 'rotation'}],
        parts: [],
        values: [0],
      },
      {
        deformers: [{controlPoints: [10, 20, 10, 120], kind: 'deformer', nodeId: 'rotation'}],
        parts: [],
        values: [1],
      },
    ],
    parameterIds: ['turn'],
    targetDeformerIds: ['rotation'],
    targetPartIds: [],
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
    parameterBindings: [
      {
        id: 'turn-binding',
        keyforms: [
          {
            deformers: [{controlPoints: [0, 0, 50, 0], kind: 'deformer', nodeId: 'Shoulder'}],
            parts: [],
            values: [0],
          },
          {
            deformers: [{controlPoints: [0, 0, 0, 50], kind: 'deformer', nodeId: 'Shoulder'}],
            parts: [],
            values: [1],
          },
        ],
        parameterIds: ['turn'],
        targetDeformerIds: ['Shoulder'],
      },
    ],
    parameters: [{defaultValue: 0, id: 'turn', maximum: 1, minimum: 0, name: 'Turn'}],
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
