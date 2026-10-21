import {expect, test} from 'vitest'
import {widgetCameraSurface} from '../widget-camera-surface'

test('should project a Retina widget onto its actual monitor rather than the settings window', () => {
  const surface = widgetCameraSurface(
    {assetId: 'asset', id: 'widget', size: {height: 400, width: 300}, x: 2300, y: 300},
    [{height: 2000, id: 'right', name: 'Right', scale: 2, width: 3000, x: 2000, y: 100}],
  )
  expect(surface).toEqual({aspect: 1.5, height: 0.4, left: 0.1, top: 0.1, width: 0.2})
})

test('should center a widget without saved position and wait for unavailable monitor dimensions', () => {
  const widget = {assetId: 'asset', id: 'widget', size: {height: 400, width: 300}, x: null, y: null}
  expect(
    widgetCameraSurface(widget, [{height: 800, id: 'screen', name: 'Screen', width: 1000}]),
  ).toEqual({aspect: 1.25, height: 0.5, left: 0.35, top: 0.25, width: 0.3})
  expect(widgetCameraSurface(widget, [])).toBeUndefined()
})
