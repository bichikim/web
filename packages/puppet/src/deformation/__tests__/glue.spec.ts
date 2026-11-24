import {expect, test} from 'vitest'
import {applyGlue} from '../glue'

test('should attach a whole hand to a rotating surface without stretching its shape', () => {
  const vertices = new Map([
    ['hand', new Float32Array([0, 0, 4, 0, 1, -3])],
    ['arm', new Float32Array([10, 10, 10, 18])],
  ])
  const connection = {
    first: {partId: 'hand', vertexIndex: 0},
    id: 'wrist',
    mode: 'rigid' as const,
    rotation: {first: 1, second: 1},
    second: {edge: {endIndex: 1, position: 0.5}, partId: 'arm', vertexIndex: 0},
    strength: 1,
    weight: 1,
  }
  applyGlue([connection], vertices)
  expect(Array.from(vertices.get('hand')!)).toEqual([10, 14, 10, 18, 13, 15])
  expect(Array.from(vertices.get('arm')!)).toEqual([10, 10, 10, 18])
  vertices.set('arm', new Float32Array([10, 18, 10, 10]))
  applyGlue([connection], vertices)
  expect(Array.from(vertices.get('hand')!)).toEqual([10, 14, 10, 10, 7, 13])
  const hand = vertices.get('hand')!
  expect(Math.hypot(hand[4]! - hand[2]!, hand[5]! - hand[3]!)).toBeCloseTo(Math.sqrt(18))
})

test('should share rigid rotation and translation without changing either part length', () => {
  const vertices = new Map([
    ['a', [0, 0, 4, 0]],
    ['b', [10, 0, 10, 4]],
  ])
  const connection = {
    first: {partId: 'a', vertexIndex: 0},
    id: 'joint',
    mode: 'rigid' as const,
    rotation: {first: 1, second: 1},
    second: {partId: 'b', vertexIndex: 0},
    strength: 0,
    weight: 0.5,
  }
  applyGlue([connection], vertices)
  expect(vertices.get('a')).toEqual([0, 0, 4, 0])
  expect(vertices.get('b')).toEqual([10, 0, 10, 4])
  applyGlue([{...connection, strength: 1}], vertices)
  for (const part of vertices.values()) {
    expect(part[0]).toBeCloseTo(5)
    expect(part[1]).toBeCloseTo(0)
    expect(part[2]).toBeCloseTo(5 + Math.sqrt(8))
    expect(part[3]).toBeCloseTo(Math.sqrt(8))
    expect(Math.hypot(part[2]! - part[0]!, part[3]! - part[1]!)).toBeCloseTo(4)
  }
})

test('should retain translation when a rigid direction collapses', () => {
  const vertices = new Map([
    ['a', [0, 0, 4, 0]],
    ['b', [10, 20, 10, 20]],
  ])
  applyGlue(
    [
      {
        first: {partId: 'a', vertexIndex: 0},
        id: 'joint',
        mode: 'rigid',
        rotation: {first: 1, second: 1},
        second: {partId: 'b', vertexIndex: 0},
        strength: 1,
        weight: 1,
      },
    ],
    vertices,
  )
  expect(vertices.get('a')).toEqual([10, 20, 14, 20])
})

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
    second: {edge: {endIndex: 1, position}, partId: 'b', vertexIndex: 0},
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

test('should move the entire source part with a moving anchor while preserving its shape', () => {
  const vertices = new Map([
    ['arm', [0, 0, 10, -20, -5, 7]],
    ['hand', [30, 40, 50, 60]],
  ])
  const connection = {
    first: {partId: 'arm', vertexIndex: 0},
    id: 'wrist',
    mode: 'translate' as const,
    second: {partId: 'hand', vertexIndex: 0},
    strength: 1,
    weight: 1,
  }
  applyGlue([connection], vertices)
  expect(vertices.get('arm')).toEqual([30, 40, 40, 20, 25, 47])
  expect(vertices.get('hand')).toEqual([30, 40, 50, 60])
  vertices.set('hand', [50, -10, 70, 10])
  applyGlue([connection], vertices)
  expect(vertices.get('arm')).toEqual([50, -10, 60, -30, 45, -3])
})

test('should share translation between two complete parts without changing either shape', () => {
  const vertices = new Map([
    ['a', [0, 0, 20, 20]],
    ['b', [8, 12, 3, 5]],
  ])
  applyGlue(
    [
      {
        first: {partId: 'a', vertexIndex: 0},
        id: 'joint',
        mode: 'translate',
        second: {partId: 'b', vertexIndex: 0},
        strength: 0.5,
        weight: 0.25,
      },
    ],
    vertices,
  )
  expect(vertices.get('a')).toEqual([1, 1.5, 21, 21.5])
  expect(vertices.get('b')).toEqual([5, 7.5, 0, 0.5])
})

test('should translate a typed vertex buffer to an edge while leaving the edge in place', () => {
  const vertices = new Map([
    ['a', new Float32Array([0, 0, 10, 0, 10, 10])],
    ['b', new Float32Array([10, 10, 30, 30])],
  ])
  applyGlue(
    [
      {
        first: {partId: 'a', vertexIndex: 1},
        id: 'wrist',
        mode: 'translate',
        second: {edge: {endIndex: 1, position: 0.5}, partId: 'b', vertexIndex: 0},
        strength: 1,
        weight: 1,
      },
    ],
    vertices,
  )
  expect(Array.from(vertices.get('a')!)).toEqual([10, 20, 20, 20, 20, 30])
  expect(Array.from(vertices.get('b')!)).toEqual([10, 10, 30, 30])
})

test('should retain both complete parts when translation strength is zero', () => {
  const vertices = new Map([
    ['a', [2, 3, 10, 20]],
    ['b', [8, 9, 30, 40]],
  ])
  applyGlue(
    [
      {
        first: {partId: 'a', vertexIndex: 0},
        id: 'joint',
        mode: 'translate',
        second: {partId: 'b', vertexIndex: 0},
        strength: 0,
        weight: 1,
      },
    ],
    vertices,
  )
  expect(vertices.get('a')).toEqual([2, 3, 10, 20])
  expect(vertices.get('b')).toEqual([8, 9, 30, 40])
})
