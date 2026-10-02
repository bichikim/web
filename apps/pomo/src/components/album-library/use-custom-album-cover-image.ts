import {type Accessor, createMemo} from 'solid-js'

import * as m from '@paraglide/message'
import {useImageBitmap} from '../../hooks/use-image-bitmap'

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
  const image = useImageBitmap(() => (props.isOpen ? props.file : null))
  const errorMessage = createMemo(() => {
    return image.error() === null ? null : m.album_custom_error_cover_invalid()
  })

  return {
    errorMessage,
    imageBitmap: image.imageBitmap,
    isLoading: image.isLoading,
    previewUrl: image.previewUrl,
  }
}
