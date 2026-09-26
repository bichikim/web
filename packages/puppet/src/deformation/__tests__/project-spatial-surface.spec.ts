import {describe, expect, test} from 'vitest'

import {projectSpatialSurface} from '../project-spatial-surface'

describe('projectSpatialSurface', () => {
  test('should preserve the front surface at zero rotation', () => {
    expect(
      projectSpatialSurface({
        rotation: [0, 0, 0],
        surface: {controlPoints: [0, 0, 0, 10, 0, 0], origin: [5, 0, 0]},
      }),
    ).toEqual({depths: [0, 0], vertices: [0, 0, 10, 0]})
  })

  test('should reveal an orthogonal side surface as the front turns edge on', () => {
    const front = {controlPoints: [0, 0, 0, 10, 0, 0], origin: [5, 0, 0]} as const
    const side = {controlPoints: [10, 0, 0, 10, 0, 4], origin: [5, 0, 0]} as const
    const frontProjection = projectSpatialSurface({rotation: [0, 90, 0], surface: front})
    const sideProjection = projectSpatialSurface({rotation: [0, 90, 0], surface: side})

    expect(frontProjection.vertices[0]).toBeCloseTo(frontProjection.vertices[2]!)
    expect(sideProjection.vertices[2]! - sideProjection.vertices[0]!).toBeCloseTo(4)
  })

  test('should rotate from rest coordinates on every evaluation', () => {
    const surface = {controlPoints: [10, 2, 0], origin: [0, 0, 0]} as const
    projectSpatialSurface({rotation: [0, 90, 0], surface})
    expect(projectSpatialSurface({rotation: [0, 0, 0], surface}).vertices).toEqual([10, 2])
  })

  test('should scale about the shared origin before rotation and then translate in 3D', () => {
    const projection = projectSpatialSurface({
      rotation: [0, 90, 0],
      scale: [2, 3, 4],
      surface: {controlPoints: [8, 10, 2], origin: [5, 5, 0]},
      translation: [10, -2, 6],
    })

    expect(projection.vertices[0]).toBeCloseTo(23)
    expect(projection.vertices[1]).toBeCloseTo(18)
    expect(projection.depths[0]).toBeCloseTo(0)
  })
})
