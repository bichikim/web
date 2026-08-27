import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {type NaturalImageLike, naturalImageSize} from '../index'

describe('naturalImageSize', () => {
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
