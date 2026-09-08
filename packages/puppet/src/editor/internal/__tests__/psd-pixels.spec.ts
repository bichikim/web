import {expect, test} from 'vitest'
import {readPsdPixels} from '../psd-pixels'

test('should apply mask coordinates and outside color without altering source pixels', () => {
  const imageData = {
    height: 1,
    width: 2,
    data: new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255]),
  }
  const layer = {left: 10, imageData, top: 20}
  const mask = {
    left: 11,
    defaultColor: 0,
    top: 20,
    imageData: {height: 1, width: 1, data: new Uint8ClampedArray([128, 128, 128, 255])},
  }
  expect([...readPsdPixels(layer, [{mask}])!.data]).toEqual([255, 0, 0, 0, 255, 0, 0, 128])
  expect(imageData.data[3]).toBe(255)
  expect(readPsdPixels(layer, [{mask: {...mask, disabled: true}}])!.data).toEqual(imageData.data)
})
