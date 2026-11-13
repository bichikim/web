import {expect, test} from 'vitest'
import {sampleWarpGrid, sampleWeightedWarpGrid} from '../sample-warp-grid'
import {createDeferredCoordinates} from '../internal/deferred-coordinates'

test('should keep native outer cells and refreshed grid poses distinct when revisiting cells', () => {
  const node = {
    bounds: {height: 1, width: 1, x: 0, y: 0},
    columns: 1,
    controlPoints: [0, 0, 2, 0, 0, 2, 4, 2],
    rows: 1,
  }
  for (const [interpolation, x] of [
    ['bilinear', -0.75],
    ['triangles', -0.6875],
    ['triangles-mirrored', -0.8125],
  ] as const) {
    const pose = {
      ...node,
      controlPoints: createDeferredCoordinates({
        length: node.controlPoints.length,
        sample: (index) => node.controlPoints[index]!,
      }),
      interpolation,
    }
    expect(sampleWarpGrid(pose, {x: -0.25, y: 0.5})).toEqual({x, y: 1})
    sampleWarpGrid(pose, {x: 0.75, y: 0.25})
    expect(sampleWarpGrid(pose, {x: -0.25, y: 0.5})).toEqual({x, y: 1})
    const translated = {...pose, controlPoints: pose.controlPoints.map((value) => value + 1)}
    expect(sampleWarpGrid(translated, {x: -0.25, y: 0.5})).toEqual({x: x + 1, y: 2})
  }
})

test('should observe edits to ordinary caller-owned grid arrays between queries', () => {
  const node = {
    bounds: {height: 1, width: 1, x: 0, y: 0},
    columns: 1,
    controlPoints: [0, 0, 1, 0, 0, 1, 1, 1],
    interpolation: 'bilinear' as const,
    rows: 1,
  }
  expect(sampleWarpGrid(node, {x: 0.5, y: 0.5})).toEqual({x: 0.5, y: 0.5})
  node.controlPoints[6] = 3
  expect(sampleWarpGrid(node, {x: 0.5, y: 0.5})).toEqual({x: 1, y: 0.5})
})

test('should preserve straight lines across a native quadrilateral cell', () => {
  const node = {
    bounds: {height: 1, width: 1, x: 0, y: 0},
    columns: 1,
    controlPoints: [0, 0, 2, 0, 0, 2, 4, 2],
    interpolation: 'bilinear' as const,
    rows: 1,
  }
  expect(sampleWarpGrid(node, {x: 0.5, y: 0.5})).toEqual({x: 1.5, y: 1})
  expect(sampleWarpGrid({...node, interpolation: 'triangles-mirrored'}, {x: 0.5, y: 0.5})).toEqual({
    x: 2,
    y: 1,
  })
  expect(sampleWarpGrid({...node, interpolation: 'triangles'}, {x: 0.5, y: 0.5})).toEqual({
    x: 1,
    y: 1,
  })
})

test('should preserve weighted grid arithmetic at inner and extended cells', () => {
  const base = {
    bounds: {height: 3, width: 7, x: -2, y: 1},
    columns: 1,
    controlPoints: [0.1, 0.2, 5.3, -0.4, 1.7, 4.9, 7.1, 3.8],
    rows: 1,
  }
  for (const interpolation of ['bilinear', 'triangles', 'triangles-mirrored'] as const) {
    const node = {...base, interpolation}
    for (const point of [
      {x: -3.3, y: 0.7},
      {x: 0.9, y: 2.3},
      {x: 6.3, y: 5.1},
    ]) {
      const sampled = sampleWarpGrid(node, point)
      for (const weight of [0.25, 1, 1.5]) {
        expect(sampleWeightedWarpGrid(node, point, weight)).toEqual({
          x: point.x + (sampled.x - point.x) * weight,
          y: point.y + (sampled.y - point.y) * weight,
        })
      }
    }
  }
})

test('should leave zero-weight grid coordinates deferred and return the input point', () => {
  const node = {
    bounds: {height: 1, width: 1, x: 0, y: 0},
    columns: 1,
    controlPoints: createDeferredCoordinates({
      length: 8,
      sample: () => {
        throw new Error('unexpected sample')
      },
    }),
    interpolation: 'bilinear' as const,
    rows: 1,
  }
  const point = {x: 0.25, y: 0.5}
  expect(sampleWeightedWarpGrid(node, point, 0)).toBe(point)
})

test('should refresh explicitly owned grid cells after coordinate inputs change', async () => {
  const {createWarpGridSampler} = await import('../sample-warp-grid')
  const values = [0, 0, 1, 0, 0, 1, 1, 1]
  const sampler = createWarpGridSampler({
    node: {
      bounds: {height: 1, width: 1, x: 0, y: 0},
      columns: 1,
      controlPoints: values,
      interpolation: 'bilinear',
      rows: 1,
    },
    points: {coordinates: values, resolve: () => {}},
  })
  const before = sampler.sample({x: 0.5, y: 0.5}, 1)
  expect(before).toEqual({x: 0.5, y: 0.5})
  values[6] = 3
  sampler.reset()
  expect(sampler.sample({x: 0.5, y: 0.5}, 1)).toEqual({x: 1, y: 0.5})
  expect(before).toEqual({x: 0.5, y: 0.5})
})

test('should write owned output storage without changing prior sampled points', async () => {
  const {createWarpGridSampler} = await import('../sample-warp-grid')
  for (const interpolation of ['bilinear', 'triangles', 'triangles-mirrored'] as const) {
    const coordinates = [0.1, 0.2, 2.3, -0.4, 0.7, 2.9, 3.1, 3.8]
    const node = {
      bounds: {height: 3, width: 2, x: -1, y: 1},
      columns: 1,
      controlPoints: coordinates,
      interpolation,
      rows: 1,
    }
    const sampler = createWarpGridSampler({node, points: {coordinates, resolve: () => {}}})
    const before = sampler.sample({x: 0, y: 2})
    const snapshot = {...before}
    const output = {x: 0, y: 0}
    for (const point of [
      {x: -2, y: 0},
      {x: 0.1, y: 2.3},
      {x: 2, y: 5},
    ]) {
      for (const weight of [0, 0.25, 1]) {
        sampler.sampleInto(point, output, weight)
        expect(output).toEqual(sampleWeightedWarpGrid(node, point, weight))
      }
    }
    coordinates[6] = 5.2
    sampler.reset()
    sampler.sampleInto({x: 0, y: 2}, output)
    expect(output).toEqual(sampleWarpGrid(node, {x: 0, y: 2}))
    expect(before).toEqual(snapshot)
  }
})
