import {expect, test} from 'vitest'
import {sampleWarpGrid} from '../sample-warp-grid'

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
