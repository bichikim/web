import {describe, expect, test} from 'vitest'

import {
  createDemoDocument,
  type PuppetParameterBinding2D,
  type PuppetParameterBinding3D,
} from '../../player'
import {getKeyformPlanes, sampleParameterCoordinates, sampleParameterVertices} from '../parameter'

const PLANE_COUNT = 60_000
// 경과 시간을 단언하지 않고 결과만 확인한다. 평면마다 전체 키폼을 다시 거르던 제곱 시간 구현은 이
// 입력에서 20초 넘게 걸려, 러너 제한 시간이 기기 속도에 둔감한 느슨한 안전장치로 남는다.
const PLANE_TIMEOUT_MS = 5000

const createPlaneBinding = (
  values: ReadonlyArray<readonly [number, number, number]>,
): PuppetParameterBinding3D => ({
  id: 'planes',
  keyforms: values.map((value) => ({parts: [], values: value})),
  parameterIds: ['x', 'y', 'z'],
})

test('should hold the lower grid corner and switch exactly at a key for discrete channels', () => {
  const values = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ] as const
  const binding = createPlaneBinding(values)
  const options = {
    binding,
    keyformCoordinates: values.map((_, index) => [index]),
    restCoordinates: [-1],
    sampling: 'step' as const,
  }
  expect(sampleParameterCoordinates({...options, values: [0.99, 0.99, 0.99]})).toEqual([0])
  expect(sampleParameterCoordinates({...options, values: [1, 0.99, 1]})).toEqual([5])
  expect(sampleParameterCoordinates({...options, values: [1, 1, 1]})).toEqual([7])
  expect(sampleParameterCoordinates({...options, values: [1 - Number.EPSILON, 1, 1]})).toEqual([7])
  expect(sampleParameterCoordinates({...options, values: [0.99999, 1, 1]})).toEqual([7])
  expect(sampleParameterCoordinates({...options, values: [0.9998, 1, 1]})).toEqual([6])
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

  test(
    'should split many planes quickly',
    () => {
      const binding = createPlaneBinding(
        Array.from({length: PLANE_COUNT}, (_, plane) => [0, 0, PLANE_COUNT - plane] as const),
      )

      const planes = getKeyformPlanes(binding)

      expect(planes).toHaveLength(PLANE_COUNT)
      expect(planes[0]).toMatchObject({indices: [PLANE_COUNT - 1], value: 1})
    },
    PLANE_TIMEOUT_MS,
  )
})

test('should interpolate a complete Cubism keyform grid with products of axis weights', () => {
  const binding: PuppetParameterBinding2D = {
    id: 'grid',
    interpolation: 'grid',
    keyforms: [
      {parts: [{partId: 'mesh', vertices: [0, 0]}], values: [0, 0]},
      {parts: [{partId: 'mesh', vertices: [0, 0]}], values: [0, 1]},
      {parts: [{partId: 'mesh', vertices: [0, 0]}], values: [1, 0]},
      {parts: [{partId: 'mesh', vertices: [4, 8]}], values: [1, 1]},
    ],
    parameterIds: ['x', 'y'],
  }
  expect(
    sampleParameterVertices({binding, partId: 'mesh', restVertices: [0, 0], values: [0.5, 0.5]}),
  ).toEqual([1, 2])
})

test('should retain exactly constant draw orders across fractional grid weights', () => {
  const binding: PuppetParameterBinding2D = {
    id: 'order',
    interpolation: 'grid',
    keyforms: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ].map(([x, y]) => ({parts: [], values: [x!, y!]})),
    parameterIds: ['x', 'y'],
  }
  expect(
    sampleParameterCoordinates({
      binding,
      keyformCoordinates: [[750], [750], [750], [750]],
      restCoordinates: [750],
      values: [0.257, 0.847],
    }),
  ).toEqual([750])
})
