import {describe, expect, it} from 'vitest'
import {fitCamera, reframeCamera, transformCamera} from '../camera'

describe('character viewer camera', () => {
  it('should fit the entire layout with its center in the viewport', () => {
    const camera = fitCamera({
      layout: {height: 1000, width: 800, x: 50, y: -100},
      viewport: {height: 1000, width: 1000},
    })
    expect(camera.zoom).toBeCloseTo(0.94)
    expect((450 - camera.x) * camera.zoom).toBeCloseTo(500)
    expect((400 - camera.y) * camera.zoom).toBeCloseTo(500)
  })

  it('should keep the model point beneath a moving pinch center', () => {
    const camera = transformCamera({
      camera: {x: 0, y: 0, zoom: 1},
      from: {span: 100, x: 100, y: 100},
      maximum: 12,
      minimum: 0.25,
      to: {span: 200, x: 140, y: 120},
    })
    expect(camera.zoom).toBe(2)
    expect(camera.x + 140 / camera.zoom).toBeCloseTo(100)
    expect(camera.y + 120 / camera.zoom).toBeCloseTo(100)
  })

  it.each([0.001, 1000])('should keep the wheel anchor when zoom reaches a limit: %s', (span) => {
    const camera = transformCamera({
      camera: {x: 80, y: -20, zoom: 1},
      from: {span: 1, x: 320, y: 180},
      maximum: 12,
      minimum: 0.25,
      to: {span, x: 320, y: 180},
    })
    expect(camera.zoom).toBe(span < 1 ? 0.25 : 12)
    expect(camera.x + 320 / camera.zoom).toBeCloseTo(400)
    expect(camera.y + 180 / camera.zoom).toBeCloseTo(160)
  })

  it('should pan without an invalid zoom when a gesture has no span', () => {
    expect(
      transformCamera({
        camera: {x: 10, y: 20, zoom: 2},
        from: {span: 0, x: 100, y: 100},
        maximum: 12,
        minimum: 0.25,
        to: {span: 0, x: 120, y: 140},
      }),
    ).toEqual({x: 0, y: 0, zoom: 2})
  })

  it('should preserve the viewed center when the viewport changes size', () => {
    const camera = reframeCamera({
      camera: {x: 30, y: -20, zoom: 2},
      from: {height: 600, width: 800},
      to: {height: 900, width: 600},
      zoom: 3,
    })
    expect(camera.x + 600 / camera.zoom / 2).toBeCloseTo(230)
    expect(camera.y + 900 / camera.zoom / 2).toBeCloseTo(130)
  })
})
