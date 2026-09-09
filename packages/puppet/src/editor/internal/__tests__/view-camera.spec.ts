import {expect, test} from 'vitest'
import {zoomViewCamera} from '../view-camera'
import {getEditorPoint} from '../viewport'

test('should retain the world point under the pointer while zooming', () => {
  const camera = zoomViewCamera({x: 30, y: -20, zoom: 1}, 2, {x: 100, y: 60})
  expect(camera).toEqual({x: 80, y: 10, zoom: 2})
  expect(camera.x + 100 / camera.zoom).toBe(130)
  expect(camera.y + 60 / camera.zoom).toBe(40)
})

test('should map a panned and zoomed editing surface back to unchanged model coordinates', () => {
  expect(
    getEditorPoint({
      bounds: {left: -360, top: -210, height: 900, width: 1200},
      clientPoint: {x: 140, y: 190},
      viewBox: {x: -100, y: -75, width: 600, height: 450},
    }),
  ).toEqual({x: 150, y: 125})
  expect(zoomViewCamera({x: 0, y: 0, zoom: 1}, 100, {x: 0, y: 0}).zoom).toBe(8)
})
