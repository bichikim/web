import {type Accessor, batch, createEffect, createSignal, onCleanup} from 'solid-js'
import {replaceBlobObjectUrl} from '../../features/blob-object-url'

export interface ImageBitmapController {
  readonly error: Accessor<Error | null>
  readonly imageBitmap: Accessor<ImageBitmap | null>
  readonly isLoading: Accessor<boolean>
  readonly previewUrl: Accessor<string | null>
}

/**
 * Decodes the current Blob after rendering; null clears the source.
 * Owns the bitmap and preview URL until replacement or disposal, including failed previews.
 * Consumers borrow these resources and must not close or revoke them.
 */
export const useImageBitmap = (source: Accessor<Blob | null>): ImageBitmapController => {
  const [imageBitmap, setImageBitmap] = createSignal<ImageBitmap | null>(null)
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null)
  const [error, setError] = createSignal<Error | null>(null)
  const [isLoading, setIsLoading] = createSignal(false)

  createEffect(() => {
    const blob = source()
    setError(null)
    setIsLoading(blob !== null)
    if (blob === null) {
      return
    }

    let isCancelled = false
    let decodedImage: ImageBitmap | null = null
    let objectUrl: string | null = null

    onCleanup(() => {
      isCancelled = true
      decodedImage?.close()
      batch(() => {
        setImageBitmap(null)
        setPreviewUrl(null)
        setIsLoading(false)
      })
      replaceBlobObjectUrl(objectUrl, () => null)
    })

    const decode = async () => {
      try {
        if (typeof globalThis.createImageBitmap === 'undefined') {
          throw new Error('Image decoding is not supported')
        }

        objectUrl = replaceBlobObjectUrl(null, () => blob)
        setPreviewUrl(objectUrl)
        const image = await globalThis.createImageBitmap(blob)
        if (isCancelled) {
          image.close()
          return
        }

        decodedImage = image
        batch(() => {
          setImageBitmap(image)
          setIsLoading(false)
        })
      } catch (cause: unknown) {
        if (isCancelled) {
          return
        }

        batch(() => {
          setError(cause instanceof Error ? cause : new Error('Image decoding failed', {cause}))
          setIsLoading(false)
        })
      }
    }

    decode()
  })

  return {error, imageBitmap, isLoading, previewUrl}
}
