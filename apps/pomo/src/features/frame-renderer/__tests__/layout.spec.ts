/** @vitest-environment node */
import {expect, it} from 'vitest'
import {calculateLayout} from '../layout'

it('should center a contained photo and compute its edge background area', () => {
  expect(
    calculateLayout({
      first: {height: 200, width: 400},
      second: null,
      viewport: {height: 600, width: 300},
    }),
  ).toEqual({
    direction: null,
    first: {scale: 0.75, x: 150, y: 300},
    height: 150,
    second: null,
    width: 300,
  })
})
it('should place different width portraits beside each other without shrinking either', () => {
  expect(
    calculateLayout({
      first: {height: 400, width: 200},
      second: {height: 400, width: 100},
      viewport: {height: 600, width: 800},
    }),
  ).toEqual({
    direction: 'horizontal',
    first: {scale: 1.5, x: 325, y: 300},
    height: 600,
    second: {scale: 1.5, x: 550, y: 300},
    width: 450,
  })
})
it('should center landscape photos vertically', () => {
  expect(
    calculateLayout({
      first: {height: 200, width: 400},
      second: {height: 100, width: 400},
      viewport: {height: 800, width: 600},
    }),
  ).toEqual({
    direction: 'vertical',
    first: {scale: 1.5, x: 300, y: 325},
    height: 450,
    second: {scale: 1.5, x: 300, y: 550},
    width: 600,
  })
})
it('should hide the companion when resizing leaves insufficient room or orientations differ', () => {
  const first = {height: 400, width: 200}
  for (const second of [
    {height: 400, width: 200},
    {height: 200, width: 400},
  ]) {
    const layout = calculateLayout({first, second, viewport: {height: 600, width: 200}})
    expect(layout.second).toBeNull()
    expect(layout.first).toEqual({scale: 1, x: 100, y: 300})
  }
})
