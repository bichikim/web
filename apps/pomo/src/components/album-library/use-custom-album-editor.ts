import {
  type Accessor,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'

import * as m from '@paraglide/message'
import {
  addCustomAlbumTracks,
  CustomAlbumError,
  type CustomAlbumIcon,
  type CustomAlbumTrack,
  readCustomAlbumDraft,
  saveCustomAlbum,
} from '../../features/custom-albums'
import {getCustomAlbumErrorMessage} from './custom-album-error-message'
import {useCustomAlbumCoverEditor} from './use-custom-album-cover-editor'

type TrackAdditionErrorKind = 'album-too-large' | 'file-type' | 'track-count' | 'track-too-large'

const getTrackAdditionErrorMessage = (kind: TrackAdditionErrorKind): string => {
  switch (kind) {
    case 'album-too-large':
      return m.album_custom_error_album_too_large()
    case 'file-type':
      return m.album_custom_error_file_type()
    case 'track-count':
      return m.album_custom_error_track_count()
    case 'track-too-large':
      return m.album_custom_error_track_too_large()
  }

  kind satisfies never
  return m.album_custom_error_save()
}

const getRemovedTrackIds = (
  initialTrackIds: ReadonlySet<string>,
  tracks: readonly CustomAlbumTrack[],
): ReadonlySet<string> => {
  const currentTrackIds = new Set(tracks.map((track) => track.id))
  return new Set([...initialTrackIds].filter((trackId) => !currentTrackIds.has(trackId)))
}

const loadCustomAlbumDraft = async (albumId: string) => {
  const album = await readCustomAlbumDraft({albumId})
  if (album === null) {
    throw new CustomAlbumError('album-missing')
  }
  return album
}

export interface UseCustomAlbumEditorProps {
  readonly albumId: string | null
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onSaved: (removedTrackIds: ReadonlySet<string>) => Promise<void>
}

export interface CustomAlbumEditorController {
  readonly artist: Accessor<string>
  readonly coverIcon: Accessor<CustomAlbumIcon>
  readonly coverImage: Accessor<Blob | null>
  readonly coverImageFile: Accessor<File | null>
  readonly errorMessage: Accessor<string | null>
  readonly handleCoverCropApplied: (coverImage: Blob) => void
  readonly handleCoverCropCanceled: () => void
  readonly handleCoverImageSelected: JSX.EventHandler<HTMLInputElement, Event>
  readonly handleFilesSelected: JSX.EventHandler<HTMLInputElement, Event>
  readonly handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent>
  readonly isBusy: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly isProcessingFiles: Accessor<boolean>
  readonly isSaving: Accessor<boolean>
  readonly removeTrack: (trackId: string) => void
  readonly selectCoverIcon: (icon: CustomAlbumIcon) => void
  readonly setArtist: (artist: string) => void
  readonly setTitle: (title: string) => void
  readonly title: Accessor<string>
  readonly totalTrackBytes: Accessor<number>
  readonly totalAlbumBytes: Accessor<number>
  readonly tracks: Accessor<readonly CustomAlbumTrack[]>
}

export const useCustomAlbumEditor = (
  props: UseCustomAlbumEditorProps,
): CustomAlbumEditorController => {
  const initialAlbumId = untrack(() => props.albumId)
  const [title, setTitle] = createSignal('')
  const [artist, setArtist] = createSignal('')
  const [tracks, setTracks] = createSignal<readonly CustomAlbumTrack[]>([])
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(initialAlbumId !== null)
  const [isProcessingFiles, setIsProcessingFiles] = createSignal(false)
  const [isSaving, setIsSaving] = createSignal(false)
  const totalTrackBytes = createMemo(() =>
    tracks().reduce((total, track) => total + track.audio.size, 0),
  )
  const cover = useCustomAlbumCoverEditor({
    getTrackBytes: totalTrackBytes,
    onErrorMessage: setErrorMessage,
  })
  const totalAlbumBytes = createMemo(() => totalTrackBytes() + (cover.coverImage()?.size ?? 0))
  const isBusy = createMemo(
    () => isLoading() || isProcessingFiles() || isSaving() || cover.coverImageFile() !== null,
  )
  let initialTrackIds: ReadonlySet<string> = new Set()
  let isDisposed = false

  const removeTrack = (trackId: string) => {
    setTracks((currentTracks) => currentTracks.filter((track) => track.id !== trackId))
    setErrorMessage(null)
  }

  const addFiles = async (files: readonly File[]) => {
    setErrorMessage(null)

    if (files.length === 0) {
      return
    }

    setIsProcessingFiles(true)

    try {
      const result = await addCustomAlbumTracks({
        currentAlbumBytes: totalAlbumBytes(),
        currentTrackCount: tracks().length,
        files,
        readEmbeddedCover: cover.shouldReadEmbeddedCover(),
      })

      if (result.kind !== 'added') {
        if (!isDisposed) {
          setErrorMessage(getTrackAdditionErrorMessage(result.kind))
        }
        return
      }

      if (!isDisposed) {
        setTracks((currentTracks) => [...currentTracks, ...result.tracks])
        if (result.embeddedCoverImage !== null) {
          cover.applyEmbeddedCover(result.embeddedCoverImage)
        }
      }
    } catch (error: unknown) {
      if (!isDisposed) {
        setErrorMessage(getCustomAlbumErrorMessage(error))
      }
    } finally {
      if (!isDisposed) {
        setIsProcessingFiles(false)
      }
    }
  }

  const handleFilesSelected: JSX.EventHandler<HTMLInputElement, Event> = async (event) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    await addFiles(selectedFiles)
  }

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    setErrorMessage(null)

    if (isBusy()) {
      return
    }
    setIsSaving(true)

    try {
      const removedTrackIds = getRemovedTrackIds(initialTrackIds, tracks())

      await saveCustomAlbum({
        albumId: initialAlbumId,
        artist: artist(),
        coverIcon: cover.coverIcon(),
        coverImage: cover.coverImageUpdate(),
        coverSource: cover.coverSource(),
        title: title(),
        tracks: tracks(),
      })
      await props.onSaved(removedTrackIds)
      props.onOpenChange(false)
    } catch (error: unknown) {
      setErrorMessage(getCustomAlbumErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const loadInitialAlbum = async () => {
    if (initialAlbumId === null) {
      return
    }

    try {
      const album = await loadCustomAlbumDraft(initialAlbumId)

      if (!isDisposed) {
        setArtist(album.artist)
        cover.restoreCover({
          coverIcon: album.coverIcon,
          coverImage: album.coverImage,
          coverSource: album.coverSource,
        })
        setTitle(album.title)
        setTracks(album.tracks)
        initialTrackIds = new Set(album.tracks.map((track) => track.id))
      }
    } catch (error: unknown) {
      if (!isDisposed) {
        setErrorMessage(getCustomAlbumErrorMessage(error))
      }
    } finally {
      if (!isDisposed) {
        setIsLoading(false)
      }
    }
  }

  onMount(() => loadInitialAlbum())
  onCleanup(() => {
    isDisposed = true
  })

  return {
    artist,
    coverIcon: cover.coverIcon,
    coverImage: cover.coverImage,
    coverImageFile: cover.coverImageFile,
    errorMessage,
    handleCoverCropApplied: cover.handleCoverCropApplied,
    handleCoverCropCanceled: cover.handleCoverCropCanceled,
    handleCoverImageSelected: cover.handleCoverImageSelected,
    handleFilesSelected,
    handleSubmit,
    isBusy,
    isLoading,
    isProcessingFiles,
    isSaving,
    removeTrack,
    selectCoverIcon: cover.selectCoverIcon,
    setArtist,
    setTitle,
    title,
    totalAlbumBytes,
    totalTrackBytes,
    tracks,
  }
}
