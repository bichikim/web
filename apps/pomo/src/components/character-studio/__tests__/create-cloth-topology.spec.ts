import {expect, it} from 'vitest'
import {createClothTopology} from '../create-cloth-topology'

it('should skip an empty selection without reading triangle or position data', () => {
  expect(
    createClothTopology({
      positions: [],
      seamPrecision: 5,
      selected: new Set(),
      triangles: {
        get length(): number {
          throw new Error('Unneeded triangle read')
        },
      },
    }),
  ).toBeUndefined()
})

it('should retain selected insertion order and orient edges by their first triangle', () => {
  const topology = createClothTopology({
    positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    seamPrecision: 5,
    selected: new Set([2, 0, 1]),
    triangles: [0, 1, 2],
  })!
  expect(topology.representatives).toEqual([2, 0, 1])
  expect([...topology.mapping]).toEqual([
    [2, 0],
    [0, 1],
    [1, 2],
  ])
  expect(topology.edges).toEqual([
    [1, 2],
    [2, 0],
    [0, 1],
  ])
  expect(topology.pinned).toEqual([false, false, false])
})

it('should include adjacent boundary vertices but omit triangles outside the selection', () => {
  const topology = createClothTopology({
    positions: [0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 2, 1, 0, 3, 0, 0],
    seamPrecision: 5,
    selected: new Set([1]),
    triangles: [0, 1, 2, 3, 4, 5],
  })!
  expect(topology.representatives).toEqual([1, 0, 2])
  expect(topology.pinned).toEqual([false, true, true])
  expect([...topology.mapping.keys()]).toEqual([1, 0, 2])
  expect(topology.edges).toEqual([
    [1, 0],
    [0, 2],
    [2, 1],
  ])
})

it('should weld a selected UV seam to its pinned boundary and omit self connections', () => {
  const topology = createClothTopology({
    positions: [0, 0, 0, 0, 0, 0, 1, 0, 0],
    seamPrecision: 5,
    selected: new Set([0]),
    triangles: [0, 1, 2],
  })!
  expect(topology.representatives).toEqual([0, 2])
  expect([...topology.mapping]).toEqual([
    [0, 0],
    [1, 0],
    [2, 1],
  ])
  expect(topology.pinned).toEqual([true, true])
  expect(topology.edges).toEqual([[0, 1]])
})

it('should deduplicate reversed and repeated edges without sorting their output', () => {
  const topology = createClothTopology({
    positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    seamPrecision: 5,
    selected: new Set([0, 1, 2]),
    triangles: [2, 1, 0, 0, 1, 2, 2, 1, 0],
  })!
  expect(topology.edges).toEqual([
    [2, 1],
    [1, 0],
    [0, 2],
  ])
})

it('should retain isolated selected vertices when a mesh has no indices', () => {
  const topology = createClothTopology({
    positions: [0, 0, 0, 1, 0, 0],
    seamPrecision: 5,
    selected: new Set([1, 0]),
    triangles: [],
  })!
  expect(topology.representatives).toEqual([1, 0])
  expect(topology.pinned).toEqual([false, false])
  expect(topology.edges).toEqual([])
})

it('should weld coordinates using the existing five decimal precision', () => {
  const topology = createClothTopology({
    positions: [0, 0, 0, 0.000004, 0, 0, 0.000006, 0, 0],
    seamPrecision: 5,
    selected: new Set([0, 1, 2]),
    triangles: [0, 1, 2],
  })!
  expect(topology.representatives).toEqual([0, 2])
  expect(topology.edges).toEqual([[0, 1]])
})

it('should use the seam precision supplied by the mesh preparation boundary', () => {
  const topology = createClothTopology({
    positions: [0, 0, 0, 0.0004, 0, 0, 0.0006, 0, 0],
    seamPrecision: 3,
    selected: new Set([0, 1, 2]),
    triangles: [0, 1, 2],
  })!
  expect(topology.representatives).toEqual([0, 2])
  expect(topology.edges).toEqual([[0, 1]])
})

it.each([Int32Array, Uint16Array, Uint32Array])(
  'should read typed mesh buffers without modifying them with %s indices',
  (Indices) => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    const triangles = new Indices([0, 1, 2])
    const selected = new Set([0, 1, 2])
    const topology = createClothTopology({positions, seamPrecision: 5, selected, triangles})!
    expect(topology.edges).toEqual([
      [0, 1],
      [1, 2],
      [2, 0],
    ])
    expect([...positions]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0])
    expect([...triangles]).toEqual([0, 1, 2])
    expect([...selected]).toEqual([0, 1, 2])
  },
)

it('should propagate the original error from a position getter', () => {
  const error = new Error('Position unavailable')
  const positions = [0, 0, 0]
  Object.defineProperty(positions, 0, {
    get: () => {
      throw error
    },
  })
  let caught: unknown
  try {
    createClothTopology({positions, seamPrecision: 5, selected: new Set([0]), triangles: []})
  } catch (reason) {
    caught = reason
  }
  expect(caught).toBe(error)
})
