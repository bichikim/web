import {describe, expect, it} from 'vitest'

import {getSquareCropFrame} from 'src/hooks/use-square-crop/get-square-crop-frame'

const viewport = {height: 300, width: 400}
const position = {x: 0, y: 0}
const image = {height: 400, width: 800}

describe('getSquareCropFrame invalid zoom contract', () => {
  it.each([0, Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'should return null for non-finite or sub-minimum zoom %s',
    (zoom) => {
      expect(getSquareCropFrame({image, position, viewport, zoom})).toBeNull()
    },
  )
})
