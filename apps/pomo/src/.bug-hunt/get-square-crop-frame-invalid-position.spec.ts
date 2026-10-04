import {describe, expect, it} from 'vitest'
import {getSquareCropFrame} from '../hooks/use-square-crop/get-square-crop-frame'

const viewport = {height: 300, width: 400}
const image = {height: 400, width: 800}

describe('getSquareCropFrame invalid position', () => {
  it.each([
    {position: {x: Number.NaN, y: 0}, label: 'NaN x'},
    {position: {x: 0, y: Number.POSITIVE_INFINITY}, label: 'Infinity y'},
    {position: {x: 2, y: 0}, label: 'x out of range'},
  ])('should return null for $label per finite [-1,1] contract', ({position}) => {
    expect(getSquareCropFrame({image, position, viewport, zoom: 1})).toBeNull()
  })
})
