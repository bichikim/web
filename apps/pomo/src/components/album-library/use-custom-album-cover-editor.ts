import {type Accessor, createSignal, type JSX} from 'solid-js'

import * as m from '@paraglide/message'
import {
  type CustomAlbumCoverSource,
  type CustomAlbumCoverUpdate,
  type CustomAlbumIcon,
  MAXIMUM_CUSTOM_ALBUM_BYTES,
  MAXIMUM_CUSTOM_COVER_SOURCE_BYTES,
} from '../../features/custom-albums'

export interface UseCustomAlbumCoverEditorProps {
  readonly getTrackBytes: Accessor<number>
  readonly onErrorMessage: (message: string | null) => void
}

export interface CustomAlbumCoverEditorController {
  readonly coverIcon: Accessor<CustomAlbumIcon>
  readonly coverImage: Accessor<Blob | null>
  readonly coverImageFile: Accessor<File | null>
  readonly coverImageUpdate: Accessor<CustomAlbumCoverUpdate>
  readonly coverSource: Accessor<CustomAlbumCoverSource>
  readonly applyEmbeddedCover: (coverImage: Blob) => void
  readonly handleCoverCropApplied: (coverImage: Blob) => void
  readonly handleCoverCropCanceled: () => void
  readonly handleCoverImageSelected: JSX.EventHandler<HTMLInputElement, Event>
  readonly shouldReadEmbeddedCover: () => boolean
  readonly restoreCover: (cover: {
    readonly coverIcon: CustomAlbumIcon
    readonly coverImage: Blob | null
    readonly coverSource: CustomAlbumCoverSource
  }) => void
  readonly selectCoverIcon: (icon: CustomAlbumIcon) => void
}

export const useCustomAlbumCoverEditor = (
  props: UseCustomAlbumCoverEditorProps,
): CustomAlbumCoverEditorController => {
  const [coverIcon, setCoverIcon] = createSignal<CustomAlbumIcon>('disc')
  const [coverImage, setCoverImage] = createSignal<Blob | null>(null)
  const [coverSource, setCoverSource] = createSignal<CustomAlbumCoverSource>('automatic')
  const [coverImageFile, setCoverImageFile] = createSignal<File | null>(null)
  const [coverImageUpdate, setCoverImageUpdate] = createSignal<CustomAlbumCoverUpdate>({
    kind: 'keep',
  })

  const handleCoverImageSelected: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    const selectedFile = event.currentTarget.files?.[0] ?? null
    event.currentTarget.value = ''

    if (selectedFile === null) {
      return
    }

    props.onErrorMessage(null)
    if (!selectedFile.type.startsWith('image/') || selectedFile.size <= 0) {
      props.onErrorMessage(m.album_custom_error_cover_invalid())
      return
    }
    if (selectedFile.size > MAXIMUM_CUSTOM_COVER_SOURCE_BYTES) {
      props.onErrorMessage(m.album_custom_error_cover_source_too_large())
      return
    }

    setCoverImageFile(selectedFile)
  }

  const selectCoverIcon = (icon: CustomAlbumIcon) => {
    setCoverIcon(icon)
    setCoverSource('manual')
    if (coverImage() !== null) {
      setCoverImage(null)
      setCoverImageUpdate({image: null, kind: 'replace'})
    }
    props.onErrorMessage(null)
  }

  const handleCoverCropApplied = (nextCoverImage: Blob) => {
    if (props.getTrackBytes() + nextCoverImage.size > MAXIMUM_CUSTOM_ALBUM_BYTES) {
      setCoverImageFile(null)
      props.onErrorMessage(m.album_custom_error_album_too_large())
      return
    }

    setCoverImage(nextCoverImage)
    setCoverSource('manual')
    setCoverImageUpdate({image: nextCoverImage, kind: 'replace'})
    setCoverImageFile(null)
    props.onErrorMessage(null)
  }

  const handleCoverCropCanceled = () => setCoverImageFile(null)

  const shouldReadEmbeddedCover = () =>
    coverSource() === 'automatic' && coverImage() === null && coverImageFile() === null

  const applyEmbeddedCover = (nextCoverImage: Blob) => {
    if (
      !shouldReadEmbeddedCover() ||
      props.getTrackBytes() + nextCoverImage.size > MAXIMUM_CUSTOM_ALBUM_BYTES
    ) {
      return
    }

    setCoverImage(nextCoverImage)
    setCoverImageUpdate({image: nextCoverImage, kind: 'replace'})
  }

  const restoreCover = (cover: {
    readonly coverIcon: CustomAlbumIcon
    readonly coverImage: Blob | null
    readonly coverSource: CustomAlbumCoverSource
  }) => {
    setCoverIcon(cover.coverIcon)
    setCoverImage(cover.coverImage)
    setCoverSource(cover.coverSource)
    setCoverImageUpdate({kind: 'keep'})
  }

  return {
    applyEmbeddedCover,
    coverIcon,
    coverImage,
    coverImageFile,
    coverImageUpdate,
    coverSource,
    handleCoverCropApplied,
    handleCoverCropCanceled,
    handleCoverImageSelected,
    restoreCover,
    selectCoverIcon,
    shouldReadEmbeddedCover,
  }
}
