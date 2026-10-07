/** @vitest-environment jsdom */

import {describe, expect, it} from 'vitest'

import {validateAlbumCover} from 'src/features/admin-music/cover-upload'

describe('validateAlbumCover MIME handling', () => {
  it('should accept a JPEG selected by extension when the browser omits file.type', () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'cover.jpg', {type: ''})

    expect(() => validateAlbumCover(file)).not.toThrow()
  })

  it('should accept a JPEG when the browser reports a non-canonical image/jpg MIME type', () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'cover.jpg', {type: 'image/jpg'})

    expect(() => validateAlbumCover(file)).not.toThrow()
  })
})
