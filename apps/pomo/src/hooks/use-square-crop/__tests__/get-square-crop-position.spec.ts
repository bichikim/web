import {describe, expect, it} from 'vitest'
import {getSquareCropFrame} from '../get-square-crop-frame'
import {getSquareCropPosition} from '../get-square-crop-position'

const frame = getSquareCropFrame({
  image: {height: 400, width: 800},
  position: {x: 0, y: 0},
  viewport: {height: 300, width: 400},
  zoom: 2,
})!

describe('getSquareCropPosition', () => {
  it.each([
    {position: {x: -1, y: -1}, selection: {size: 100, x: 0, y: 50}},
    {position: {x: 0, y: 0}, selection: {size: 100, x: 150, y: 100}},
    {position: {x: 1, y: 1}, selection: {size: 100, x: 300, y: 150}},
    {position: {x: 0.5, y: -0.5}, selection: {size: 100, x: 225, y: 75}},
  ])('should recover normalized position $position from selection coordinates', (sample) => {
    expect(getSquareCropPosition(frame, sample.selection)).toEqual(sample.position)
  })

  it('should clamp selections beyond the image bounds', () => {
    expect(getSquareCropPosition(frame, {size: 100, x: -100, y: 400})).toEqual({x: -1, y: 1})
  })

  it('should center an axis with no room to move after resizing', () => {
    expect(getSquareCropPosition(frame, {size: 200, x: 100, y: 50})).toEqual({x: 0, y: 0})
  })

  it('should center both axes when the square selection fills a square image', () => {
    const squareFrame = getSquareCropFrame({
      image: {height: 300, width: 300},
      position: {x: 1, y: -1},
      viewport: {height: 300, width: 400},
      zoom: 1,
    })!

    expect(getSquareCropPosition(squareFrame, {size: 300, x: 50, y: 0})).toEqual({x: 0, y: 0})
  })
})
