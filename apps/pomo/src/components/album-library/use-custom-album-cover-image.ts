import {
  type Accessor,
  catchError,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from 'solid-js'

import * as m from '@paraglide/message'
import {useImageBitmap} from 'src/hooks/use-image-bitmap'
import {useObjectUrl} from 'src/hooks/use-object-url'

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
  const source = createMemo(() => (props.isOpen ? props.file : null))
  const [current, setCurrent] = createSignal<CustomAlbumCoverImageController | null>(null)

  createEffect(() => {
    const file = source()
    if (file === null) {
      return
    }

    // Scope both resources to this file so preview readiness cannot belong to a previous source.
    const isSupported = typeof globalThis.createImageBitmap !== 'undefined'
    const [previewFailed, setPreviewFailed] = createSignal(false)
    const objectUrl = catchError(
      () => useObjectUrl(() => (isSupported ? file : null)),
      () => setPreviewFailed(true),
    )
    const image = useImageBitmap(() => {
      return !isSupported || objectUrl?.() !== undefined ? file : null
    })
    const errorMessage = createMemo(() => {
      return previewFailed() || image.error() !== null ? m.album_custom_error_cover_invalid() : null
    })

    setCurrent({
      errorMessage,
      imageBitmap: image.imageBitmap,
      isLoading: image.isLoading,
      previewUrl: () => objectUrl?.() ?? null,
    })
    onCleanup(() => setCurrent(null))
  })

  return {
    errorMessage: () => current()?.errorMessage() ?? null,
    imageBitmap: () => current()?.imageBitmap() ?? null,
    isLoading: () => current()?.isLoading() ?? false,
    previewUrl: () => current()?.previewUrl() ?? null,
  }
}
