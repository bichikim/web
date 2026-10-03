/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useCustomAlbumCoverImage} from '../use-custom-album-cover-image'

vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should remain neutral during SSR without allocating or decoding an open cover', () => {
  const decode = vi.fn()
  const createUrl = vi.spyOn(URL, 'createObjectURL')
  vi.stubGlobal('createImageBitmap', decode)

  createRoot((dispose) => {
    const result = useCustomAlbumCoverImage({file: new File(['image'], 'image.png'), isOpen: true})

    expect(result.imageBitmap()).toBeNull()
    expect(result.previewUrl()).toBeNull()
    expect(result.errorMessage()).toBeNull()
    expect(result.isLoading()).toBe(false)
    dispose()
  })

  expect(decode).not.toHaveBeenCalled()
  expect(createUrl).not.toHaveBeenCalled()
})
