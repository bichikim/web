/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useImageBitmap} from '..'

vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should remain idle during SSR without accessing browser image APIs', () => {
  const decode = vi.fn()
  const createUrl = vi.spyOn(URL, 'createObjectURL')
  vi.stubGlobal('createImageBitmap', decode)

  createRoot((dispose) => {
    const image = useImageBitmap(() => new Blob(['image']))

    expect(image.imageBitmap()).toBeNull()
    expect(image.previewUrl()).toBeNull()
    expect(image.error()).toBeNull()
    expect(image.isLoading()).toBe(false)
    dispose()
  })

  expect(decode).not.toHaveBeenCalled()
  expect(createUrl).not.toHaveBeenCalled()
})
