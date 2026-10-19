import {describe, expect, test} from 'vitest'

import {
  createDemoDocument,
  type PuppetParameterBinding2D,
  type PuppetParameterBinding3D,
} from '../../player'
import {getKeyformPlanes, sampleParameterVertices} from '../parameter'

const PLANE_COUNT = 24_000
const PLANE_TIME_LIMIT_MS = 1000

const createPlaneBinding = (
  values: ReadonlyArray<readonly [number, number, number]>,
): PuppetParameterBinding3D => ({
  id: 'planes',
  keyforms: values.map((value) => ({parts: [], values: value})),
  parameterIds: ['x', 'y', 'z'],
})

describe('sampleParameterVertices', () => {
  test('should interpolate a two-dimensional point set through its Delaunay triangles', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!

    expect(
      sampleParameterVertices({
        binding: document.parameterBindings?.[0],
        partId: part.id,
        restVertices: part.mesh.vertices,
        values: [15, 15],
      }).slice(-2),
    ).toEqual([352, 272])
  })

  test('should interpolate a sparse triangular keyform set', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const binding = document.parameterBindings?.[0] as PuppetParameterBinding2D
    const sparseBinding = {
      ...binding,
      keyforms: binding.keyforms.filter((keyform) =>
        [
          [0, 0],
          [30, 0],
          [0, 30],
        ].some(([x, y]) => keyform.values[0] === x && keyform.values[1] === y),
      ),
    }

    expect(
      sampleParameterVertices({
        binding: sparseBinding,
        partId: part.id,
        restVertices: part.mesh.vertices,
        values: [15, 15],
      }).slice(-2),
    ).toEqual([352, 272])
  })

  test('should project onto a sparse line when fewer than three non-collinear keyforms remain', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const binding = document.parameterBindings?.[0] as PuppetParameterBinding2D
    const lineBinding = {
      ...binding,
      keyforms: binding.keyforms.filter(
        (keyform) => keyform.values[1] === 0 && keyform.values[0] !== 0,
      ),
    }

    expect(
      sampleParameterVertices({
        binding: lineBinding,
        partId: part.id,
        restVertices: part.mesh.vertices,
        values: [0, 20],
      }).slice(-2),
    ).toEqual([320, 240])
  })

  test('should clamp outside values to the grid edge', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!

    expect(
      sampleParameterVertices({
        binding: document.parameterBindings?.[0],
        partId: part.id,
        restVertices: part.mesh.vertices,
        values: [-100, 100],
      }).slice(-2),
    ).toEqual([256, 304])
  })
})

describe('getKeyformPlanes', () => {
  test('should group keyforms by increasing third value and keep document order', () => {
    const binding = createPlaneBinding([
      [1, 0, 2],
      [0, 0, -1],
      [0, 0, 2],
      [1, 0, -1],
    ])

    expect(
      getKeyformPlanes(binding).map((plane) => ({
        indices: plane.indices,
        value: plane.value,
        values: plane.binding.keyforms.map((keyform) => keyform.values),
      })),
    ).toEqual([
      {
        indices: [1, 3],
        value: -1,
        values: [
          [0, 0],
          [1, 0],
        ],
      },
      {
        indices: [0, 2],
        value: 2,
        values: [
          [1, 0],
          [0, 0],
        ],
      },
    ])
  })

  test('should split many planes quickly', () => {
    const binding = createPlaneBinding(
      Array.from({length: PLANE_COUNT}, (_, plane) => [0, 0, PLANE_COUNT - plane] as const),
    )

    const start = performance.now()
    const planes = getKeyformPlanes(binding)
    const elapsed = performance.now() - start

    expect(planes).toHaveLength(PLANE_COUNT)
    expect(planes[0]).toMatchObject({indices: [PLANE_COUNT - 1], value: 1})
    expect(elapsed).toBeLessThan(PLANE_TIME_LIMIT_MS)
  })
})
