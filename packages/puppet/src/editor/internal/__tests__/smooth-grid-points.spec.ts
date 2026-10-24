import {expect, test} from 'vitest'
import {smoothGridPoints} from '../smooth-grid-points'

const points = [0, 0, 50, 0, 100, 0, 0, 50, 70, 60, 100, 50, 0, 100, 50, 100, 100, 100]

test('should smooth a displaced grid center and preserve its boundary', () => {
  const result = smoothGridPoints({
    center: {x: 70, y: 60},
    columns: 2,
    controlPoints: points,
    radius: 80,
    rows: 2,
    strength: 1,
  })
  expect(result.slice(8, 10)).toEqual([50, 50])
  expect(result.filter((_, index) => index !== 8 && index !== 9)).toEqual(
    points.filter((_, index) => index !== 8 && index !== 9),
  )
  expect(points[8]).toBe(70)
})

test('should preserve distant points and blend the requested strength', () => {
  expect(
    smoothGridPoints({
      center: {x: 70, y: 60},
      columns: 2,
      controlPoints: points,
      radius: 80,
      rows: 2,
      strength: 0.5,
    }).slice(8, 10),
  ).toEqual([60, 55])
  expect(
    smoothGridPoints({
      center: {x: 300, y: 300},
      columns: 2,
      controlPoints: points,
      radius: 10,
      rows: 2,
      strength: 1,
    }),
  ).toEqual(points)
})

test('should measure the radius in displayed coordinates under scaled ancestors', () => {
  const result = smoothGridPoints({
    center: {x: 140, y: 120},
    columns: 2,
    controlPoints: points,
    radius: 80,
    rows: 2,
    strength: 1,
    transform: (point) => ({x: point.x * 2, y: point.y * 2}),
  })
  expect(result.slice(8, 10)).toEqual([50, 50])
})
