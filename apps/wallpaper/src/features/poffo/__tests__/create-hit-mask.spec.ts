import {expect, it} from 'vitest'
import {createHitMask} from '../create-hit-mask'

it('should retain opaque pixels and leave holes and clear margins outside the hit region', () => {
  const data = new Uint8ClampedArray([
    0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 1,
  ])
  expect(createHitMask({data, height: 2, width: 4})).toEqual({
    height: 2,
    runs: [
      [0, 1, 3],
      [1, 0, 1],
      [1, 3, 4],
    ],
    width: 4,
  })
})

it('should retain the final opaque span of a row and represent a fully clear frame without spans', () => {
  expect(
    createHitMask({data: new Uint8ClampedArray([0, 0, 0, 255]), height: 1, width: 1}).runs,
  ).toEqual([[0, 0, 1]])
  expect(createHitMask({data: new Uint8ClampedArray(16), height: 2, width: 2}).runs).toEqual([])
})

it('should allow speech sampling to exclude partial edge pixels without changing the default alpha policy', () => {
  const pixels = {data: new Uint8ClampedArray([0, 0, 0, 64, 0, 0, 0, 128]), height: 1, width: 2}
  expect(createHitMask(pixels).runs).toEqual([[0, 0, 2]])
  expect(createHitMask({...pixels, alphaThreshold: 127}).runs).toEqual([[0, 1, 2]])
})
