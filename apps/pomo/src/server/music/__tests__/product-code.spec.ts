import {describe, expect, it} from 'vitest'

import {getAlbumProductCode} from '../product-code'

describe('getAlbumProductCode', () => {
  it('should create a stable album-scoped product code', () => {
    expect(getAlbumProductCode('019d1990-1dc9-7255-a7b5-f9459dfaf782')).toBe(
      'album.019d1990-1dc9-7255-a7b5-f9459dfaf782',
    )
  })
})
