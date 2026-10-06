import {expect, test} from 'vitest'

import type {PuppetPart, PuppetSpatialMesh} from '../../../player'
import {createSpatialReferenceVertices} from '../create-spatial-reference-vertices'

const part: PuppetPart = {
  id: 'target',
  mesh: {
    indices: [0, 1, 2],
    uvs: [0, 0, 1, 0, 0, 1],
    vertices: [0, 0, 100, 0, 0, 100],
  },
  texture: {height: 100, src: 'data:image/png;base64,', width: 100},
}

const slopedMesh: PuppetSpatialMesh = {
  indices: [0, 1, 2],
  source: {kind: 'imported', name: 'sloped'},
  vertices: [0, 0, 0, 100, 0, 10, 0, 100, 20],
}

test('should place image vertices on the sampled front surface', () => {
  const vertices = createSpatialReferenceVertices(part, slopedMesh)

  expect(vertices).toBeDefined()
  expect(vertices![0]).toBeCloseTo(0)
  expect(vertices![1]).toBeCloseTo(0)
  expect(vertices![3]).toBe(100)
  expect(vertices![7]).toBe(-100)
  expect(vertices![2]).toBeGreaterThan(0)
  expect(vertices![5]).toBeCloseTo(vertices![2]! + 10)
  expect(vertices![8]).toBeCloseTo(vertices![2]! + 20)
})

test('should keep the reference flat before a mesh exists', () => {
  const vertices = createSpatialReferenceVertices(part)
  expect(vertices).toHaveLength(9)
  expect(vertices![1]).toBeCloseTo(0)
  expect(vertices![7]).toBe(-100)
  expect([vertices![2], vertices![5], vertices![8]]).toEqual([0, 0, 0])
})
