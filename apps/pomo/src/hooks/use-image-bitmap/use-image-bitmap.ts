import {type Accessor, batch, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'

export interface ImageBitmapController {
  readonly error: Accessor<Error | null>
  readonly imageBitmap: Accessor<ImageBitmap | null>
  readonly isLoading: Accessor<boolean>
}

/**
 * Decodes the current Blob after rendering; null clears the source.
 * Owns one bitmap per Blob identity until replacement or disposal.
 * Consumers borrow the bitmap and must not close it.
 */
export const useImageBitmap = (source: Accessor<Blob | null>): ImageBitmapController => {
  const blob = createMemo(source)
  const [imageBitmap, setImageBitmap] = createSignal<ImageBitmap | null>(null)
  const [error, setError] = createSignal<Error | null>(null)
  const [isLoading, setIsLoading] = createSignal(false)

  createEffect(() => {
    const current = blob()
    setError(null)
    setIsLoading(current !== null)
    if (current === null) {
      return
    }

    let isCancelled = false
    let decodedImage: ImageBitmap | null = null

    onCleanup(() => {
      isCancelled = true
      decodedImage?.close()
      batch(() => {
        setImageBitmap(null)
        setIsLoading(false)
      })
    })

    const decode = async () => {
      try {
        if (typeof globalThis.createImageBitmap === 'undefined') {
          throw new Error('Image decoding is not supported')
        }

        const image = await globalThis.createImageBitmap(current)
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

  return {error, imageBitmap, isLoading}
}
