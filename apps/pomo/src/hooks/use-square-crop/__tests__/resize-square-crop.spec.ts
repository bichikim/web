import {describe, expect, it} from 'vitest'
import {getSquareCropFrame} from '../get-square-crop-frame'
import {resizeSquareCrop} from '../resize-square-crop'

const frame = getSquareCropFrame({
  image: {height: 400, width: 400},
  position: {x: 0, y: 0},
  viewport: {height: 400, width: 400},
  zoom: 2,
})!
const zoomLimits = {maximum: 4, minimum: 1}
const cases = [
  {handle: 'north', pointer: {x: 200, y: 50}, selection: {size: 250, x: 75, y: 50}},
  {handle: 'northeast', pointer: {x: 350, y: 50}, selection: {size: 250, x: 100, y: 50}},
  {handle: 'northwest', pointer: {x: 50, y: 50}, selection: {size: 250, x: 50, y: 50}},
  {handle: 'east', pointer: {x: 350, y: 200}, selection: {size: 250, x: 100, y: 75}},
  {handle: 'southeast', pointer: {x: 350, y: 350}, selection: {size: 250, x: 100, y: 100}},
  {handle: 'south', pointer: {x: 200, y: 350}, selection: {size: 250, x: 75, y: 100}},
  {handle: 'southwest', pointer: {x: 50, y: 350}, selection: {size: 250, x: 50, y: 100}},
  {handle: 'west', pointer: {x: 50, y: 200}, selection: {size: 250, x: 50, y: 75}},
] as const

describe('resizeSquareCrop', () => {
  it.each(cases)('should preserve the opposite anchor when resizing $handle', (sample) => {
    expect(
      resizeSquareCrop({frame, handle: sample.handle, pointer: sample.pointer, zoomLimits}),
    ).toEqual(sample.selection)
  })

  it.each(cases)('should keep $handle resizing inside the image bounds', (sample) => {
    const pointer = {
      x: (sample.pointer.x - 200) * 100,
      y: (sample.pointer.y - 200) * 100,
    }
    const selection = resizeSquareCrop({frame, handle: sample.handle, pointer, zoomLimits})

    expect(selection.size).toBe(300)
    expect(selection.x).toBeGreaterThanOrEqual(frame.imageX)
    expect(selection.y).toBeGreaterThanOrEqual(frame.imageY)
    expect(selection.x + selection.size).toBeLessThanOrEqual(frame.imageX + frame.imageWidth)
    expect(selection.y + selection.size).toBeLessThanOrEqual(frame.imageY + frame.imageHeight)
  })

  it('should choose the larger axis distance when dragging a corner unevenly', () => {
    expect(
      resizeSquareCrop({frame, handle: 'southeast', pointer: {x: 320, y: 350}, zoomLimits}),
    ).toEqual({size: 250, x: 100, y: 100})
  })

  it('should enforce maximum zoom when the pointer crosses the opposite anchor', () => {
    expect(
      resizeSquareCrop({frame, handle: 'northwest', pointer: {x: 500, y: 500}, zoomLimits}),
    ).toEqual({size: 100, x: 200, y: 200})
  })

  it('should enforce a configured minimum zoom before reaching the image boundary', () => {
    expect(
      resizeSquareCrop({
        frame,
        handle: 'southeast',
        pointer: {x: 500, y: 500},
        zoomLimits: {maximum: 4, minimum: 2},
      }),
    ).toEqual({size: 200, x: 100, y: 100})
  })

  it('should cap the minimum size when the anchor has less available space', () => {
    const edgeFrame = getSquareCropFrame({
      image: {height: 400, width: 400},
      position: {x: -1, y: -1},
      viewport: {height: 400, width: 400},
      zoom: 8,
    })!

    expect(
      resizeSquareCrop({
        frame: edgeFrame,
        handle: 'northwest',
        pointer: {x: 100, y: 100},
        zoomLimits,
      }),
    ).toEqual({size: 50, x: 0, y: 0})
  })

  it('should respect letterboxed image bounds for a centered side handle', () => {
    const portraitFrame = getSquareCropFrame({
      image: {height: 800, width: 400},
      position: {x: 0, y: 1},
      viewport: {height: 400, width: 400},
      zoom: 2,
    })!

    expect(
      resizeSquareCrop({
        frame: portraitFrame,
        handle: 'north',
        pointer: {x: 200, y: -100},
        zoomLimits,
      }),
    ).toEqual({size: 200, x: 100, y: 200})
  })
})
