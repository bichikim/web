import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'

import * as m from '@paraglide/message'
import {replaceBlobObjectUrl} from '../../features/blob-object-url'

interface UseCustomAlbumCoverImageProps {
  readonly file: File
  readonly isOpen: boolean
}

export interface CustomAlbumCoverImageController {
  readonly errorMessage: Accessor<string | null>
  readonly imageBitmap: Accessor<ImageBitmap | null>
  readonly isLoading: Accessor<boolean>
  readonly previewUrl: Accessor<string | null>
}

export const useCustomAlbumCoverImage = (
  props: UseCustomAlbumCoverImageProps,
): CustomAlbumCoverImageController => {
  const [imageBitmap, setImageBitmap] = createSignal<ImageBitmap | null>(null)
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)

  createEffect(() => {
    if (!props.isOpen) {
      return
    }

    const {file} = props
    setErrorMessage(null)
    setImageBitmap(null)
    setIsLoading(true)

    if (typeof globalThis.createImageBitmap === 'undefined') {
      setErrorMessage(m.album_custom_error_cover_invalid())
      setIsLoading(false)
      return
    }

    const objectUrl = replaceBlobObjectUrl(null, () => file)
    setPreviewUrl(objectUrl)
    let isCancelled = false
    let decodedImage: ImageBitmap | null = null

    globalThis
      .createImageBitmap(file)
      .then((image) => {
        if (isCancelled) {
          image.close()
          return
        }

        decodedImage = image
        setImageBitmap(image)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isCancelled) {
          setErrorMessage(m.album_custom_error_cover_invalid())
          setIsLoading(false)
        }
      })

    onCleanup(() => {
      isCancelled = true
      decodedImage?.close()
      setImageBitmap(null)
      setPreviewUrl(null)
      if (objectUrl !== null) {
        replaceBlobObjectUrl(objectUrl, () => null)
      }
    })
  })

  return {errorMessage, imageBitmap, isLoading, previewUrl}
}
