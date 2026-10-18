/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {type NaturalImageLike, naturalImageSize} from '../index'

describe('naturalImageSize', () => {
  it('should refresh dimensions when the same image finishes loading', () => {
    const image = document.createElement('img')
    const api = createRoot((dispose) => ({dispose, size: naturalImageSize(image)}))
    try {
      expect(api.size()).toEqual({height: 0, width: 0})
      Object.defineProperties(image, {
        naturalHeight: {value: 720},
        naturalWidth: {value: 1280},
      })
      image.dispatchEvent(new Event('load'))
      expect(api.size()).toEqual({height: 720, width: 1280})
    } finally {
      api.dispose()
    }
  })

  it('should stop listening to images that are replaced or removed', () => {
    const first = document.createElement('img')
    const second = document.createElement('img')
    const firstRemoval = vi.spyOn(first, 'removeEventListener')
    const secondRemoval = vi.spyOn(second, 'removeEventListener')
    const api = createRoot((dispose) => {
      const [image, setImage] = createSignal<NaturalImageLike | null>(first)
      return {dispose, setImage, size: naturalImageSize(image)}
    })
    try {
      api.setImage(second)
      expect(firstRemoval).toHaveBeenCalledWith('load', expect.any(Function))
      Object.defineProperties(second, {
        naturalHeight: {value: 480},
        naturalWidth: {value: 640},
      })
      second.dispatchEvent(new Event('load'))
      expect(api.size()).toEqual({height: 480, width: 640})
      api.setImage(null)
      expect(secondRemoval).toHaveBeenCalledWith('load', expect.any(Function))
      expect(api.size()).toEqual({height: 0, width: 0})
    } finally {
      api.dispose()
      firstRemoval.mockRestore()
      secondRemoval.mockRestore()
    }
  })

  it('should reset dimensions after a load error and remove listeners on disposal', () => {
    const image = document.createElement('img')
    let width = 640
    let height = 480
    Object.defineProperties(image, {
      naturalHeight: {get: () => height},
      naturalWidth: {get: () => width},
    })
    const removal = vi.spyOn(image, 'removeEventListener')
    const api = createRoot((dispose) => ({dispose, size: naturalImageSize(image)}))
    try {
      expect(api.size()).toEqual({height: 480, width: 640})
      width = 0
      height = 0
      image.dispatchEvent(new Event('error'))
      expect(api.size()).toEqual({height: 0, width: 0})
      api.dispose()
      expect(removal).toHaveBeenCalledWith('load', expect.any(Function))
      expect(removal).toHaveBeenCalledWith('error', expect.any(Function))
    } finally {
      api.dispose()
      removal.mockRestore()
    }
  })

  it('should react to image dimensions and reset when the image is absent', () => {
    createRoot((dispose) => {
      const [image, setImage] = createSignal<NaturalImageLike | null>(null)
      const size = naturalImageSize(image)

      expect(size()).toEqual({height: 0, width: 0})

      setImage({naturalHeight: 720, naturalWidth: 1280})

      expect(size()).toEqual({height: 720, width: 1280})

      setImage(null)

      expect(size()).toEqual({height: 0, width: 0})
      dispose()
    })
  })
})
