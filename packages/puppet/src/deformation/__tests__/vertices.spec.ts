import {expect, test} from 'vitest'
import type {PuppetSceneDeformerNode} from '../../player/document'
import {applySceneNodeDeformers} from '../vertices'
import {rebindDeformer} from '../binding'

const node: PuppetSceneDeformerNode = {
  id: 'bone',
  kind: 'deformer',
  locked: false,
  name: 'Bone',
  bounds: {x: 0, width: 100, y: 0, height: 100},
  columns: 1,
  visible: true,
  boneRestPoints: [0, 0, 50, 0, 100, 0],
  children: ['a', 'b'].map((id) => ({id, name: id, kind: 'part', locked: false, visible: true})),
  rows: 1,
  boneWeights: [
    {partId: 'a', vertexIndex: 0, weights: [1, 0]},
    {partId: 'a', vertexIndex: 1, weights: [0, 1]},
  ],
  controlPoints: [0, 0, 50, 0, 50, 50],
}

test('should apply different bone weights to coincident vertices and retain automatic weights for other parts', () => {
  const vertices = new Map([
    ['a', [75, 0, 75, 0]],
    ['b', [75, 0]],
  ])
  applySceneNodeDeformers([node], vertices)
  expect(vertices.get('a')![0]).toBeCloseTo(75)
  expect(vertices.get('a')![1]).toBeCloseTo(0)
  expect(vertices.get('a')![2]).toBeCloseTo(50)
  expect(vertices.get('a')![3]).toBeCloseTo(25)
  expect(vertices.get('b')![1]).toBeGreaterThan(24)
})

test('should preserve weighted deformation through a rest-layout rebind', () => {
  const rebound = rebindDeformer(node, {
    ...node,
    boneRestPoints: [0, 10, 50, 10, 100, 10],
    controlPoints: [0, 10, 50, 10, 100, 10],
  })
  const before = new Map([['a', [75, 0, 75, 0]]])
  const after = new Map([['a', [75, 0, 75, 0]]])
  applySceneNodeDeformers([node], before)
  applySceneNodeDeformers([rebound], after)
  expect(after).toEqual(before)
})

test('should compose weighted child and parent deformers with the same vertex identity', () => {
  const parent = {...node, controlPoints: [10, 0, 60, 0, 110, 0], id: 'parent', children: [node]}
  const vertices = new Map([['a', [75, 0, 75, 0]]])
  applySceneNodeDeformers([parent], vertices)
  expect(vertices.get('a')![0]).toBeCloseTo(85)
  expect(vertices.get('a')![2]).toBeCloseTo(60)
  expect(vertices.get('a')![3]).toBeCloseTo(25)
})

test('should keep the unweighted portion at its input position for a single bone', () => {
  const single = {
    ...node,
    boneRestPoints: [0, 0, 100, 0],
    boneWeights: [0, 0.25, 1].map((weight, vertexIndex) => ({
      partId: 'a',
      vertexIndex,
      weights: [weight],
    })),
    controlPoints: [20, 0, 120, 0],
  }
  const vertices = new Map([
    ['a', [50, 0, 50, 0, 50, 0]],
    ['b', [50, 0]],
  ])
  applySceneNodeDeformers([single], vertices)
  expect(vertices.get('a')).toEqual([50, 0, 55, 0, 70, 0])
  expect(vertices.get('b')).toEqual([70, 0])
})
