import {expect, test} from 'vitest'
import {applyGlue} from '../glue'

test('should join two deformed boundary points at their weighted position', () => {
  const vertices = new Map([
    ['a', [0, 0, 20, 20]],
    ['b', [10, 10]],
  ])
  applyGlue(
    [
      {
        first: {partId: 'a', vertexIndex: 0},
        id: 'seam',
        second: {partId: 'b', vertexIndex: 0},
        strength: 1,
        weight: 0.25,
      },
    ],
    vertices,
  )
  expect(vertices.get('a')).toEqual([2.5, 2.5, 20, 20])
  expect(vertices.get('b')).toEqual([2.5, 2.5])
})

test('should weaken glue without changing the input at zero strength', () => {
  const vertices = new Map([
    ['a', [0, 0]],
    ['b', [10, 0]],
  ])
  const glue = {
    first: {partId: 'a', vertexIndex: 0},
    id: 'seam',
    second: {partId: 'b', vertexIndex: 0},
    strength: 0,
    weight: 0,
  }
  applyGlue([glue], vertices)
  expect(vertices.get('b')).toEqual([10, 0])
  applyGlue([{...glue, strength: 0.5}], vertices)
  expect(vertices.get('a')).toEqual([0, 0])
  expect(vertices.get('b')).toEqual([5, 0])
})

test('should attach multiple vertices to a moving edge without moving its endpoints', () => {
  const vertices = new Map([
    ['a', [0, 4, 5, 4, 10, 4]],
    ['b', [10, 10, 30, 30]],
  ])
  const connections = [0, 0.5, 1].map((position, vertexIndex) => ({
    first: {partId: 'a', vertexIndex},
    id: `edge-${vertexIndex}`,
    second: {partId: 'b', edge: {endIndex: 1, position}, vertexIndex: 0},
    strength: 1,
    weight: 1,
  }))
  applyGlue(connections, vertices)
  expect(vertices.get('a')).toEqual([10, 10, 20, 20, 30, 30])
  expect(vertices.get('b')).toEqual([10, 10, 30, 30])
  vertices.set('b', [0, 0, 0, 40])
  applyGlue(connections, vertices)
  expect(vertices.get('a')).toEqual([0, 0, 0, 20, 0, 40])
})
