import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {useImageView} from '../use-image-view'

describe('useImageView', () => {
  const setup = () => {
    const [viewport, setViewport] = createSignal({height: 200, width: 300})
    return {
      image: useImageView({natural: () => ({height: 400, width: 800}), viewport}),
      setViewport,
    }
  }
  it('should fit without upscaling and react to viewport changes', () => {
    createRoot((dispose) => {
      const {image, setViewport} = setup()
      expect(image.view()).toMatchObject({height: 150, scale: 0.375, width: 300, x: 0, y: 25})
      expect(image.fitting()).toBe(true)
      expect(image.pannable()).toBe(false)
      setViewport({height: 800, width: 1200})
      expect(image.percent()).toBe(100)
      expect(image.view()).toMatchObject({x: 200, y: 200})
      dispose()
    })
  })
  it('should zoom around the requested point and clamp manual zoom limits', () => {
    createRoot((dispose) => {
      const {image} = setup()
      image.zoom(75, {x: 75, y: 50})
      expect(image.view()).toMatchObject({scale: 0.75, x: -75, y: 0})
      expect(image.fitting()).toBe(false)
      image.zoom(2000)
      expect(image.percent()).toBe(1600)
      image.zoom(0)
      expect(image.percent()).toBe(1)
      image.zoom(Number.NaN)
      expect(image.percent()).toBe(1)
      image.fit()
      expect(image.percent()).toBe(37.5)
      dispose()
    })
  })
  it('should pan only along overflowing axes and stop at the image edges', () => {
    createRoot((dispose) => {
      const {image} = setup()
      image.zoom(100)
      image.begin(1, {x: 100, y: 100})
      image.move(2, {x: 1000, y: 1000})
      expect(image.view()).toMatchObject({x: -250, y: -100})
      image.move(1, {x: 150, y: 120})
      expect(image.view()).toMatchObject({x: -200, y: -80})
      image.move(1, {x: 1000, y: 1000})
      expect(image.view()).toMatchObject({x: 0, y: 0})
      image.move(1, {x: -1000, y: -1000})
      expect(image.view()).toMatchObject({x: -500, y: -200})
      image.end(1)
      expect(image.dragging()).toBe(false)
      image.move(1, {x: 100, y: 100})
      expect(image.view()).toMatchObject({x: -500, y: -200})
      dispose()
    })
  })
  it('should pinch from fit mode and resume one-finger panning without a jump', () => {
    createRoot((dispose) => {
      const {image} = setup()
      image.begin(1, {x: 100, y: 100})
      image.begin(2, {x: 200, y: 100})
      expect(image.begin(3, {x: 400, y: 100})).toBe(false)
      image.move(2, {x: 300, y: 100})
      expect(image.view()).toMatchObject({scale: 0.75, x: -100, y: -50})
      image.end(2)
      image.move(1, {x: 120, y: 100})
      expect(image.view()).toMatchObject({scale: 0.75, x: -80, y: -50})
      image.end(1)
      image.fit()
      expect(image.dragging()).toBe(false)
      expect(image.view()).toMatchObject({scale: 0.375, x: 0, y: 25})
      dispose()
    })
  })
})
