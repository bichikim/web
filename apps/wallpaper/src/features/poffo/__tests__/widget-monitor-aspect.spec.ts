import {expect, test} from 'vitest'
import {widgetMonitorAspect} from '../widget-monitor-aspect'
test('should use the widget monitor rather than its own portrait aspect or the first monitor', () => {
  const widget = {assetId: 'asset', id: 'widget', size: {height: 577, width: 445}, x: 2000, y: 100}
  expect(
    widgetMonitorAspect(widget, [
      {height: 1080, id: 'left', name: 'Left', scale: 1, width: 1920, x: 0, y: 0},
      {height: 2000, id: 'right', name: 'Right', scale: 2, width: 3000, x: 1920, y: 0},
    ]),
  ).toBe(1.5)
})
