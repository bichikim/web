import {describe, expect, it} from 'vitest'
import {getSquareCropFrame} from '../get-square-crop-frame'

const viewport = {height: 300, width: 400}
const position = {x: 0, y: 0}

describe('getSquareCropFrame', () => {
  it('should fit a landscape image and center the full shorter source edge', () => {
    expect(
      getSquareCropFrame({image: {height: 400, width: 800}, position, viewport, zoom: 1}),
    ).toEqual({
      cropSize: 200,
      cropX: 100,
      cropY: 50,
      imageHeight: 200,
      imageWidth: 400,
      imageX: 0,
      imageY: 50,
      maximumCropSize: 200,
      maxX: 100,
      maxY: 0,
      sourceSize: 400,
      sourceX: 200,
      sourceY: 0,
    })
  })

  it('should fit a portrait image inside a non-square viewport', () => {
    expect(
      getSquareCropFrame({image: {height: 600, width: 200}, position, viewport, zoom: 1}),
    ).toMatchObject({
      cropSize: 100,
      cropX: 150,
      cropY: 100,
      imageHeight: 300,
      imageWidth: 100,
      imageX: 150,
      imageY: 0,
      sourceSize: 200,
      sourceX: 0,
      sourceY: 200,
    })
  })

  it('should upscale a small image while preserving its source coordinates', () => {
    expect(
      getSquareCropFrame({image: {height: 20, width: 40}, position, viewport, zoom: 2}),
    ).toMatchObject({
      cropSize: 100,
      cropX: 150,
      cropY: 100,
      imageHeight: 200,
      imageWidth: 400,
      maximumCropSize: 200,
      sourceSize: 10,
      sourceX: 15,
      sourceY: 5,
    })
  })

  it.each([
    {position: {x: -1, y: -1}, sourceX: 0, sourceY: 0},
    {position: {x: 1, y: -1}, sourceX: 600, sourceY: 0},
    {position: {x: -1, y: 1}, sourceX: 0, sourceY: 200},
    {position: {x: 1, y: 1}, sourceX: 600, sourceY: 200},
  ])('should align the crop to the image bounds at $position', (sample) => {
    const frame = getSquareCropFrame({
      image: {height: 400, width: 800},
      position: sample.position,
      viewport,
      zoom: 2,
    })

    expect(frame).toMatchObject({
      sourceSize: 200,
      sourceX: sample.sourceX,
      sourceY: sample.sourceY,
    })
  })

  it('should map an interior normalized position without clamping', () => {
    expect(
      getSquareCropFrame({
        image: {height: 400, width: 800},
        position: {x: 0.5, y: -0.5},
        viewport,
        zoom: 2,
      }),
    ).toMatchObject({sourceSize: 200, sourceX: 450, sourceY: 50})
  })

  it.each([
    {x: Number.NaN, y: 0},
    {x: 0, y: Number.NaN},
    {x: Number.POSITIVE_INFINITY, y: 0},
    {x: 0, y: Number.POSITIVE_INFINITY},
    {x: Number.NEGATIVE_INFINITY, y: 0},
    {x: 0, y: Number.NEGATIVE_INFINITY},
    {x: 2, y: 0},
    {x: 1 + Number.EPSILON, y: 0},
    {x: -1 - Number.EPSILON, y: 0},
    {x: 0, y: 1 + Number.EPSILON},
    {x: 0, y: -1 - Number.EPSILON},
  ])('should return null for an invalid normalized position $x, $y', (invalidPosition) => {
    expect(
      getSquareCropFrame({
        image: {height: 400, width: 800},
        position: invalidPosition,
        viewport,
        zoom: 2,
      }),
    ).toBeNull()
  })

  it.each([
    {height: 0, width: 400},
    {height: 300, width: 0},
    {height: -1, width: 400},
    {height: 300, width: -1},
    {height: Number.NaN, width: 400},
    {height: 300, width: Number.NaN},
    {height: Number.POSITIVE_INFINITY, width: 400},
    {height: 300, width: Number.POSITIVE_INFINITY},
  ])('should omit the frame for invalid dimensions $width by $height', (dimensions) => {
    expect(getSquareCropFrame({image: dimensions, position, viewport, zoom: 1})).toBeNull()
    expect(
      getSquareCropFrame({image: viewport, position, viewport: dimensions, zoom: 1}),
    ).toBeNull()
  })
})
