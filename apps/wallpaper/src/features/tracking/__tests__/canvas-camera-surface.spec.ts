import {expect, test} from 'vitest'
import {canvasCameraSurface} from '../canvas-camera-surface'
test('should convert native canvas coordinates and Retina scale into monitor fractions', () => {
  expect(
    canvasCameraSurface({
      bounds: {height: 400, left: 100, top: 50, width: 300},
      viewport: {height: 1000, scale: 2, width: 2000, x: 200, y: 100},
    }),
  ).toEqual({aspect: 2, height: 0.8, left: 0.2, top: 0.2, width: 0.3})
  expect(
    canvasCameraSurface({bounds: {height: 400, left: 0, top: 0, width: 300}, viewport: null}),
  ).toBeNull()
})
