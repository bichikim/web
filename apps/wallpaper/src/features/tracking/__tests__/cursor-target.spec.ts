import {expect, test} from 'vitest'
import {createCursorTarget} from '../cursor-target'

const bounds = {height: 400, left: 100, top: 50, width: 200}
const viewport = {height: 800, width: 1200}
const point = {height: 800, width: 1200, x: 200, y: 170}
const target = (x: number, y = 170) =>
  createCursorTarget({bounds, point: {...point, x, y}, viewport})

test('should follow distance from the face with a continuous curve that softens toward its limit', () => {
  expect(target(200)).toEqual({x: 0, y: 0})
  expect(target(320).x).toBeCloseTo(0.5)
  const near = target(260).x
  const middle = target(320).x
  const far = target(380).x
  expect(near).toBeGreaterThan(0)
  expect(middle).toBeGreaterThan(near)
  expect(far).toBeGreaterThan(middle)
  expect(far - middle).toBeLessThan(middle - near)
  expect(target(2000).x).toBeGreaterThan(target(1000).x)
  expect(target(2000).x).toBeLessThan(1)
  expect(target(80).x).toBeCloseTo(-0.5)
})

test('should preserve diagonal direction instead of independently saturating both axes', () => {
  const diagonal = target(800, -1030)
  expect(diagonal.y / diagonal.x).toBeCloseTo(2)
  expect(Math.hypot(diagonal.x, diagonal.y)).toBeLessThan(1)
  expect(target(200, 50).y).toBeCloseTo(0.5)
})

test('should use the configured face anchor and normalize native physical pixels to CSS coordinates', () => {
  expect(
    createCursorTarget({
      bounds,
      options: {faceX: 0.25, faceY: 0.5},
      point: {...point, x: 150, y: 250},
      viewport,
    }),
  ).toEqual({x: 0, y: 0})
  const logical = target(320)
  const physical = createCursorTarget({
    bounds,
    point: {height: 1600, width: 2400, x: 640, y: 340},
    viewport,
  })
  expect(physical).toEqual(logical)
  const scaled = createCursorTarget({
    bounds: {height: 800, left: 200, top: 100, width: 400},
    point: {height: 1600, width: 2400, x: 640, y: 340},
    viewport: {height: 1600, width: 2400},
  })
  expect(scaled).toEqual(logical)
  expect(
    createCursorTarget({
      bounds,
      point: {...point, height: 1600, width: 3000},
      viewport: {height: 1600, width: 3000},
    }),
  ).toEqual({x: 0, y: 0})
})

test('should remain neutral for hidden canvases and invalid cursor dimensions', () => {
  expect(createCursorTarget({bounds: {...bounds, height: 0}, point, viewport})).toEqual({
    x: 0,
    y: 0,
  })
  expect(createCursorTarget({bounds, point: {...point, width: 0}, viewport})).toEqual({x: 0, y: 0})
  expect(createCursorTarget({bounds, point: {...point, x: Number.NaN}, viewport})).toEqual({
    x: 0,
    y: 0,
  })
})
