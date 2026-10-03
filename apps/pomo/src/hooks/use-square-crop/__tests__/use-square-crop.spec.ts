/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {batch, createSignal} from 'solid-js'
import {createStore} from 'solid-js/store'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {SquareCropDimensions, SquareCropZoomLimits} from '../types'
import {useSquareCrop} from '../use-square-crop'

interface RenderCropOptions {
  readonly image?: SquareCropDimensions | null
  readonly keyboardStep?: number
  readonly viewport?: SquareCropDimensions
  readonly zoomLimits?: SquareCropZoomLimits
}

const renderCrop = (options: RenderCropOptions = {}) => {
  const [image, setImage] = createSignal<SquareCropDimensions | null>(
    options.image === undefined ? {height: 400, width: 400} : options.image,
  )
  const [viewport, setViewport] = createSignal(options.viewport ?? {height: 200, width: 200})
  const [zoomLimits, setZoomLimits] = createSignal(options.zoomLimits ?? {maximum: 4, minimum: 1})
  const view = renderHook(() =>
    useSquareCrop({image, keyboardStep: options.keyboardStep, viewport, zoomLimits}),
  )

  return {...view, setImage, setViewport, setZoomLimits}
}

afterEach(cleanup)

describe('useSquareCrop geometry', () => {
  it.each([
    {
      image: {height: 10, width: 20},
      selection: {size: 100, x: 50, y: 0},
      source: {sourceSize: 10, sourceX: 5, sourceY: 0},
      viewport: {height: 100, width: 200},
    },
    {
      image: {height: 200, width: 100},
      selection: {size: 100, x: 100, y: 50},
      source: {sourceSize: 100, sourceX: 0, sourceY: 50},
      viewport: {height: 200, width: 300},
    },
    {
      image: {height: 200, width: 400},
      selection: {size: 100, x: 50, y: 100},
      source: {sourceSize: 200, sourceX: 100, sourceY: 0},
      viewport: {height: 300, width: 200},
    },
  ])('should center a $image.width by $image.height image in its viewport', (example) => {
    const {result} = renderCrop(example)

    expect(result.position()).toEqual({x: 0, y: 0})
    expect(result.zoom()).toBe(1)
    expect(result.selection()).toEqual(example.selection)
    expect(result.frame()).toMatchObject(example.source)
  })

  it.each([
    null,
    {height: 100, width: 0},
    {height: -1, width: 100},
    {height: Number.NaN, width: 100},
    {height: 100, width: Number.POSITIVE_INFINITY},
  ])('should expose no frame or selection for an unavailable image %j', (image) => {
    const {result} = renderCrop({image})

    expect(result.frame()).toBeNull()
    expect(result.selection()).toBeNull()
    expect(result.beginGesture({handle: 'move', point: {x: 0, y: 0}, pointerId: 1})).toBe(false)
    expect(result.moveWithKeyboard('ArrowRight')).toBe(false)
    expect(result.resizeWithKeyboard('east', 'ArrowRight')).toBe(false)
  })

  it.each([
    {height: 200, width: 0},
    {height: -1, width: 200},
    {height: Number.POSITIVE_INFINITY, width: 200},
    {height: 200, width: Number.NaN},
  ])('should expose no frame for an invalid viewport %j', (viewport) => {
    const {result} = renderCrop({viewport})

    expect(result.frame()).toBeNull()
    expect(result.selection()).toBeNull()
    expect(result.beginGesture({handle: 'move', point: {x: 0, y: 0}, pointerId: 1})).toBe(false)
  })

  it('should bound zoom and position commands and recover from non-finite values', () => {
    const {result} = renderCrop({zoomLimits: {maximum: 3, minimum: 1.5}})

    expect(result.zoom()).toBe(1.5)
    result.changeZoom(Number.POSITIVE_INFINITY)
    result.moveTo({x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY})
    expect(result.zoom()).toBe(3)
    expect(result.position()).toEqual({x: 1, y: -1})
    result.changeZoom(Number.NEGATIVE_INFINITY)
    result.moveTo({x: -20, y: 20})
    expect(result.zoom()).toBe(1.5)
    expect(result.position()).toEqual({x: -1, y: 1})
    result.changeZoom(Number.NaN)
    result.moveTo({x: Number.NaN, y: Number.NaN})
    expect(result.zoom()).toBe(1.5)
    expect(result.position()).toEqual({x: 0, y: 0})
    expect(result.frame()?.sourceSize).toBeCloseTo(400 / 1.5)
  })

  it('should reset the current selection to the center and configured minimum zoom', () => {
    const {result} = renderCrop({zoomLimits: {maximum: 4, minimum: 2}})
    result.changeZoom(3)
    result.moveTo({x: 1, y: -1})

    result.reset()

    expect(result.zoom()).toBe(2)
    expect(result.position()).toEqual({x: 0, y: 0})
    expect(result.selection()).toEqual({size: 100, x: 50, y: 50})
  })
})

describe('useSquareCrop pointer gestures', () => {
  it.each([
    {x: Number.NaN, y: 100},
    {x: 100, y: Number.NaN},
    {x: Number.POSITIVE_INFINITY, y: 100},
    {x: 100, y: Number.NEGATIVE_INFINITY},
  ])(
    'should reject non-finite pointer coordinates without losing an active gesture %j',
    (point) => {
      const {result} = renderCrop()
      result.changeZoom(2)

      expect(result.beginGesture({handle: 'move', point, pointerId: 1})).toBe(false)
      expect(result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})).toBe(
        true,
      )
      result.moveGesture({point, pointerId: 1})
      expect(result.selection()).toEqual({size: 100, x: 50, y: 50})
      result.moveGesture({point: {x: 110, y: 110}, pointerId: 1})
      expect(result.selection()).toEqual({size: 100, x: 60, y: 60})
    },
  )

  it('should move from the gesture origin and clamp the selection inside the image', () => {
    const {result} = renderCrop()
    result.changeZoom(2)
    expect(result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})).toBe(true)

    result.moveGesture({point: {x: 120, y: 130}, pointerId: 1})
    expect(result.selection()).toEqual({size: 100, x: 70, y: 80})
    result.moveGesture({point: {x: 110, y: 110}, pointerId: 1})
    expect(result.selection()).toEqual({size: 100, x: 60, y: 60})
    result.moveGesture({point: {x: 1000, y: -1000}, pointerId: 1})
    expect(result.position()).toEqual({x: 1, y: -1})
    expect(result.selection()).toEqual({size: 100, x: 100, y: 0})
  })

  it.each([
    {handle: 'north', point: {x: 100, y: 30}, start: {x: 100, y: 50}, x: 40, y: 30},
    {handle: 'northeast', point: {x: 170, y: 30}, start: {x: 150, y: 50}, x: 50, y: 30},
    {handle: 'east', point: {x: 170, y: 100}, start: {x: 150, y: 100}, x: 50, y: 40},
    {handle: 'southeast', point: {x: 170, y: 170}, start: {x: 150, y: 150}, x: 50, y: 50},
    {handle: 'south', point: {x: 100, y: 170}, start: {x: 100, y: 150}, x: 40, y: 50},
    {handle: 'southwest', point: {x: 30, y: 170}, start: {x: 50, y: 150}, x: 30, y: 50},
    {handle: 'west', point: {x: 30, y: 100}, start: {x: 50, y: 100}, x: 30, y: 40},
    {handle: 'northwest', point: {x: 30, y: 30}, start: {x: 50, y: 50}, x: 30, y: 30},
  ] as const)('should preserve the opposite anchor when resizing $handle', (example) => {
    const {result} = renderCrop()
    result.changeZoom(2)
    expect(result.beginGesture({handle: example.handle, point: example.start, pointerId: 1})).toBe(
      true,
    )

    result.moveGesture({point: example.point, pointerId: 1})

    expect(result.selection()).toEqual({size: 120, x: example.x, y: example.y})
    expect(result.zoom()).toBeCloseTo(200 / 120)
  })

  it('should limit pointer resizing by the image bounds and maximum zoom', () => {
    const {result} = renderCrop()
    result.changeZoom(2)
    result.beginGesture({handle: 'east', point: {x: 150, y: 100}, pointerId: 1})

    result.moveGesture({point: {x: 1000, y: 100}, pointerId: 1})
    expect(result.selection()).toEqual({size: 150, x: 50, y: 25})
    result.moveGesture({point: {x: -1000, y: 100}, pointerId: 1})
    expect(result.selection()).toEqual({size: 50, x: 50, y: 75})
    expect(result.zoom()).toBe(4)
  })

  it('should retain the active pointer when a second pointer begins, moves, or ends', () => {
    const {result} = renderCrop()
    result.changeZoom(2)
    result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})

    expect(result.beginGesture({handle: 'move', point: {x: 0, y: 0}, pointerId: 2})).toBe(false)
    result.moveGesture({point: {x: 150, y: 150}, pointerId: 2})
    result.endGesture(2)
    expect(result.selection()).toEqual({size: 100, x: 50, y: 50})
    result.moveGesture({point: {x: 110, y: 110}, pointerId: 1})
    expect(result.selection()).toEqual({size: 100, x: 60, y: 60})
    result.endGesture(1)
    result.moveGesture({point: {x: 150, y: 150}, pointerId: 1})
    expect(result.selection()).toEqual({size: 100, x: 60, y: 60})
  })

  it('should cancel the current pointer when ending without a pointer ID', () => {
    const {result} = renderCrop()
    result.changeZoom(2)
    result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})

    result.endGesture()
    result.moveGesture({point: {x: 150, y: 150}, pointerId: 1})

    expect(result.selection()).toEqual({size: 100, x: 50, y: 50})
    expect(result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 2})).toBe(true)
  })
})

describe('useSquareCrop keyboard commands', () => {
  it.each([
    {key: 'ArrowRight', x: 55, y: 50},
    {key: 'ArrowLeft', x: 45, y: 50},
    {key: 'ArrowDown', x: 50, y: 55},
    {key: 'ArrowUp', x: 50, y: 45},
  ])('should move five viewport units for $key', ({key, x, y}) => {
    const {result} = renderCrop()
    result.changeZoom(2)

    expect(result.moveWithKeyboard(key)).toBe(true)
    expect(result.selection()).toEqual({size: 100, x, y})
  })

  it('should honor a custom keyboard step for movement and corner resizing', () => {
    const {result} = renderCrop({keyboardStep: 10})
    result.changeZoom(2)

    expect(result.moveWithKeyboard('ArrowRight')).toBe(true)
    expect(result.selection()).toEqual({size: 100, x: 60, y: 50})
    expect(result.resizeWithKeyboard('northwest', 'ArrowLeft')).toBe(true)
    expect(result.selection()).toEqual({size: 110, x: 50, y: 40})
    expect(result.resizeWithKeyboard('northwest', 'ArrowDown')).toBe(true)
    expect(result.selection()).toEqual({size: 100, x: 60, y: 50})
  })

  it('should leave the selection unchanged for unsupported keys and perpendicular edge keys', () => {
    const {result} = renderCrop()
    result.changeZoom(2)

    expect(result.moveWithKeyboard('Enter')).toBe(false)
    expect(result.resizeWithKeyboard('east', 'Enter')).toBe(false)
    result.resizeWithKeyboard('east', 'ArrowUp')

    expect(result.selection()).toEqual({size: 100, x: 50, y: 50})
  })

  it('should keep movement at the image boundary without invalid normalized coordinates', () => {
    const {result} = renderCrop({image: {height: 200, width: 400}})
    result.moveTo({x: 1, y: 0})

    result.moveWithKeyboard('ArrowRight')
    result.moveWithKeyboard('ArrowDown')

    expect(result.position()).toEqual({x: 1, y: 0})
    expect(result.selection()).toEqual({size: 100, x: 100, y: 50})
  })
})

describe('useSquareCrop cancellation and ownership', () => {
  it.each(['zoom', 'position', 'reset', 'move-key', 'resize-key'] as const)(
    'should cancel an active gesture when executing a %s command',
    (command) => {
      const {result} = renderCrop()
      result.changeZoom(2)
      result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})

      switch (command) {
        case 'zoom':
          result.changeZoom(3)
          break
        case 'position':
          result.moveTo({x: 0.5, y: -0.5})
          break
        case 'reset':
          result.reset()
          break
        case 'move-key':
          result.moveWithKeyboard('ArrowRight')
          break
        case 'resize-key':
          result.resizeWithKeyboard('east', 'ArrowRight')
          break
      }
      const selection = result.selection()
      result.moveGesture({point: {x: 150, y: 150}, pointerId: 1})

      expect(result.selection()).toEqual(selection)
      expect(result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 2})).toBe(
        true,
      )
    },
  )

  it.each(['identity', 'dimensions', 'viewport', 'limits'] as const)(
    'should cancel stale gestures on an input %s change while retaining bounded state',
    (change) => {
      const view = renderCrop()
      view.result.changeZoom(3)
      view.result.moveTo({x: 0.5, y: -0.5})
      view.result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})

      switch (change) {
        case 'identity':
          view.setImage({height: 400, width: 400})
          break
        case 'dimensions':
          view.setImage({height: 400, width: 800})
          break
        case 'viewport':
          view.setViewport({height: 100, width: 300})
          break
        case 'limits':
          view.setZoomLimits({maximum: 2, minimum: 1})
          break
      }
      const selection = view.result.selection()
      view.result.moveGesture({point: {x: 150, y: 150}, pointerId: 1})

      expect(view.result.position()).toEqual({x: 0.5, y: -0.5})
      expect(view.result.zoom()).toBe(change === 'limits' ? 2 : 3)
      expect(view.result.selection()).toEqual(selection)
      expect(
        view.result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 2}),
      ).toBe(true)
    },
  )

  it('should clear unavailable geometry and resume with retained state when the image returns', () => {
    const view = renderCrop()
    view.result.changeZoom(2)
    view.result.moveTo({x: 0.5, y: -0.5})
    view.result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})

    view.setImage(null)
    expect(view.result.frame()).toBeNull()
    expect(view.result.selection()).toBeNull()
    view.setImage({height: 400, width: 400})
    view.result.moveGesture({point: {x: 150, y: 150}, pointerId: 1})

    expect(view.result.zoom()).toBe(2)
    expect(view.result.selection()).toEqual({size: 100, x: 75, y: 25})
  })

  it('should track dimension changes inside the same caller-owned image object', () => {
    const [image, setImage] = createStore({height: 400, width: 400})
    const {result} = renderCrop({image})
    result.changeZoom(2)
    result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})

    setImage('width', 800)
    result.moveGesture({point: {x: 150, y: 150}, pointerId: 1})

    expect(result.position()).toEqual({x: 0, y: 0})
    expect(result.zoom()).toBe(2)
    expect(result.selection()).toEqual({size: 50, x: 75, y: 75})
    expect(result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 2})).toBe(true)
  })

  it('should reject a stale pointer update before a batched input change finishes flushing', () => {
    const view = renderCrop()
    view.result.changeZoom(2)
    view.result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})

    batch(() => {
      view.setViewport({height: 100, width: 100})
      view.result.moveGesture({point: {x: 150, y: 150}, pointerId: 1})
    })

    expect(view.result.position()).toEqual({x: 0, y: 0})
    expect(view.result.selection()).toEqual({size: 50, x: 25, y: 25})
  })

  it('should retain a gesture started after image replacement in the same batch', () => {
    const view = renderCrop()
    view.result.changeZoom(2)

    batch(() => {
      view.setImage({height: 400, width: 400})
      expect(
        view.result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1}),
      ).toBe(true)
    })
    view.result.moveGesture({point: {x: 110, y: 110}, pointerId: 1})

    expect(view.result.selection()).toEqual({size: 100, x: 60, y: 60})
  })

  it('should accept a new pointer after replacing an active gesture image in the same batch', () => {
    const view = renderCrop()
    view.result.changeZoom(2)
    view.result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})

    batch(() => {
      view.setImage({height: 400, width: 400})
      expect(
        view.result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 2}),
      ).toBe(true)
    })
    view.result.moveGesture({point: {x: 150, y: 150}, pointerId: 1})
    expect(view.result.selection()).toEqual({size: 100, x: 50, y: 50})
    view.result.moveGesture({point: {x: 110, y: 110}, pointerId: 2})

    expect(view.result.selection()).toEqual({size: 100, x: 60, y: 60})
  })

  it('should dispose a gesture started after image replacement before its batch flushes', () => {
    const view = renderCrop()
    view.result.changeZoom(2)

    batch(() => {
      view.setImage({height: 400, width: 400})
      expect(
        view.result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1}),
      ).toBe(true)
      view.cleanup()
    })
    view.result.moveGesture({point: {x: 110, y: 110}, pointerId: 1})

    expect(view.result.position()).toEqual({x: 0, y: 0})
  })

  it('should apply a raised minimum and retain the bounded zoom when limits expand again', () => {
    const view = renderCrop()

    view.setZoomLimits({maximum: 4, minimum: 2})
    expect(view.result.zoom()).toBe(2)
    view.result.changeZoom(4)
    view.setZoomLimits({maximum: 3, minimum: 2})
    expect(view.result.zoom()).toBe(3)
    view.setZoomLimits({maximum: 4, minimum: 1})
    expect(view.result.zoom()).toBe(3)
    view.result.reset()
    expect(view.result.zoom()).toBe(1)
  })

  it('should dispose the active gesture without closing the caller-owned image', () => {
    const image = {close: vi.fn(), height: 400, width: 400}
    const view = renderCrop({image})
    view.result.changeZoom(2)
    view.result.beginGesture({handle: 'move', point: {x: 100, y: 100}, pointerId: 1})

    view.cleanup()
    view.result.moveGesture({point: {x: 150, y: 150}, pointerId: 1})

    expect(view.result.position()).toEqual({x: 0, y: 0})
    expect(image.close).not.toHaveBeenCalled()
  })
})
