import {describe, expect, test} from 'vitest'

import {deformBrushVertices} from '../deform-brush-vertices'

describe('deformBrushVertices', () => {
  const vertices = [0, 0, 5, 0, 10, 0, 15, 0]

  test('should move nearby vertices with decreasing influence', () => {
    expect(
      deformBrushVertices({
        center: {x: 0, y: 0},
        delta: {x: 0, y: 10},
        hardness: 0,
        radius: 10,
        strength: 1,
        vertices,
      }),
    ).toEqual([0, 10, 5, 5, 10, 0, 15, 0])
  })

  test('should keep the inner region at full influence when hardness increases', () => {
    expect(
      deformBrushVertices({
        center: {x: 0, y: 0},
        delta: {x: 10, y: 0},
        hardness: 0.5,
        radius: 10,
        strength: 0.5,
        vertices,
      }),
    ).toEqual([5, 0, 10, 0, 10, 0, 15, 0])
  })

  test('should preserve input and ignore a zero displacement', () => {
    const result = deformBrushVertices({
      center: {x: 0, y: 0},
      delta: {x: 0, y: 0},
      hardness: 0,
      radius: 10,
      strength: 1,
      vertices,
    })
    expect(result).toEqual(vertices)
    expect(vertices).toEqual([0, 0, 5, 0, 10, 0, 15, 0])
  })
})
