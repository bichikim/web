import {type Accessor, createEffect, createMemo, on, onCleanup} from 'solid-js'
import {useAsyncTask} from 'src/features/async-task'

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
  const task = useAsyncTask({
    cleanupResult: (image: ImageBitmap) => image.close(),
    task: (current: Blob) => {
      if (typeof globalThis.createImageBitmap === 'undefined') {
        throw new Error('Image decoding is not supported')
      }
      return globalThis.createImageBitmap(current)
    },
  })

  createEffect(
    on(blob, (current) => {
      onCleanup(task.reset)
      if (current !== null) {
        // The task state supplies diagnostics; this effect has no promise consumer.
        task.execute(current).catch(() => undefined)
      }
    }),
  )

  const imageBitmap = () => {
    const state = task.state()
    return state.status === 'success' ? state.result : null
  }
  const error = createMemo(() => {
    const state = task.state()
    if (state.status !== 'error') {
      return null
    }
    const cause = state.error
    return cause instanceof Error ? cause : new Error('Image decoding failed', {cause})
  })
  const isLoading = () => task.state().status === 'pending'

  return {error, imageBitmap, isLoading}
}
