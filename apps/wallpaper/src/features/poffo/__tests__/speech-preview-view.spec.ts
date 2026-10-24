import {expect, it} from 'vitest'
import {speechPreviewView} from '../speech-preview-view'

it('should include the widget and the default speech area', () => {
  const view = speechPreviewView({})
  expect(view.minX).toBeLessThan(0)
  expect(view.minY).toBeLessThan(0)
  expect(view.maxX).toBeGreaterThan(0.9 + 272 / 320)
  expect(view.maxY).toBeGreaterThan(1)
  expect(view.minY).toBeLessThan(0.05 - 132 / 420)
})

it('should keep saved off-widget anchors reachable at every allowed corner', () => {
  for (const point of [
    {x: -1, y: -0.5},
    {x: 2, y: 1.5},
  ]) {
    const view = speechPreviewView({
      size: {height: 210, width: 160},
      speech: {enabled: true, ...point},
    })
    expect(view.minX).toBeLessThan(Math.min(0, point.x))
    expect(view.minY).toBeLessThan(Math.min(0, point.y))
    expect(view.maxX).toBeGreaterThan(point.x + 272 / 160)
    expect(view.maxY).toBeGreaterThan(point.y + 132 / 210)
  }
})
