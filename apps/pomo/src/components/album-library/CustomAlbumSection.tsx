import {createSignal, For, Show} from 'solid-js'

import {type ResolvedCustomAlbum, revokeCustomTrackObjectUrls} from '../../features/custom-albums'
import type {PResolvedAlbum, PTrack, PTrackPreviewRequest} from '../../features/focus-room-audio'
import {PButton} from '../p-button/PButton'
import {PFormMessage} from '../p-form-message/PFormMessage'
import * as m from '@paraglide/message'
import {AlbumCard} from './Card'
import {CustomAlbumEditorModal} from './CustomAlbumEditorModal'
import {getCustomAlbumErrorMessage} from './custom-album-error-message'

interface CustomAlbumSectionProps {
  readonly albums: readonly ResolvedCustomAlbum[]
  readonly error: Error | null
  readonly isLoading: boolean
  readonly onAddAlbum: (album: PResolvedAlbum) => void
  readonly onAddTrack: (track: PTrack) => void
  readonly onDeleteAlbum: (albumId: string) => Promise<void>
  readonly onRemoveTracks?: (trackIds: ReadonlySet<string>) => void
  readonly onSaved: () => Promise<void>
  readonly onPreview: (request: PTrackPreviewRequest) => void
  readonly onRetry: () => void
  readonly pendingTrackId: string | null
  readonly playingTrackId: string | null
  readonly trackIds: ReadonlySet<string>
}

export const CustomAlbumSection = (props: CustomAlbumSectionProps) => {
  const [deleteErrorMessage, setDeleteErrorMessage] = createSignal<string | null>(null)
  const [editorAlbumId, setEditorAlbumId] = createSignal<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = createSignal(false)
  const [deletingAlbumId, setDeletingAlbumId] = createSignal<string | null>(null)
  const isAlbumInPlayer = (album: PResolvedAlbum) =>
    album.tracks.length > 0 && album.tracks.every((track) => props.trackIds.has(track.id))
  const removeTracksFromPlayer = (
    trackIds: ReadonlySet<string>,
    tracks: readonly PTrack[] = props.albums.flatMap((album) => album.tracks),
  ) => {
    const previewingTrack = tracks.find(
      (track) => track.id === props.playingTrackId && trackIds.has(track.id),
    )

    if (previewingTrack !== undefined) {
      props.onPreview(previewingTrack)
    }

    props.onRemoveTracks?.(trackIds)
    revokeCustomTrackObjectUrls(
      new Set([...trackIds].filter((trackId) => !props.trackIds.has(trackId))),
    )
  }
  const handleSaved = async (removedTrackIds: ReadonlySet<string>) => {
    removeTracksFromPlayer(removedTrackIds)
    await props.onSaved()
  }
  const handleCreate = () => {
    setEditorAlbumId(null)
    setIsEditorOpen(true)
  }
  const handleEdit = (albumId: string) => {
    setEditorAlbumId(albumId)
    setIsEditorOpen(true)
  }
  const handleDeleteAlbum = async (album: ResolvedCustomAlbum) => {
    if (deletingAlbumId() !== null) {
      return
    }

    setDeleteErrorMessage(null)
    setDeletingAlbumId(album.id)

    try {
      await props.onDeleteAlbum(album.id)
      removeTracksFromPlayer(new Set(album.tracks.map((track) => track.id)), album.tracks)
    } catch (error: unknown) {
      setDeleteErrorMessage(getCustomAlbumErrorMessage(error))
    } finally {
      setDeletingAlbumId(null)
    }
  }

  return (
    <section class="grid gap-3 pb-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="m-0 text-base font-750 leading-5 text-foreground">
            {m.album_custom_heading()}
          </h2>
          <p class="mb-0 mt-1 text-sm leading-5 text-muted-foreground">
            {m.album_custom_description()}
          </p>
        </div>
        <PButton icon="i-tabler-plus" onPress={handleCreate} size="small">
          {m.album_custom_create()}
        </PButton>
      </div>

      <Show when={props.error !== null}>
        <div class="grid justify-items-start gap-2">
          <PFormMessage tone="error">{getCustomAlbumErrorMessage(props.error)}</PFormMessage>
          <PButton bordered onPress={props.onRetry} size="small" tone="secondary" transparent>
            {m.album_custom_retry()}
          </PButton>
        </div>
      </Show>

      <Show when={props.isLoading}>
        <p class="m-0 text-sm leading-6 text-muted-foreground" role="status">
          {m.album_custom_loading()}
        </p>
      </Show>

      <Show when={!props.isLoading && props.error === null && props.albums.length === 0}>
        <p class="m-0 rounded-control border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">
          {m.album_custom_empty()}
        </p>
      </Show>

      <Show when={props.albums.length > 0}>
        <div class="grid gap-3 2xl:grid-cols-2">
          <For each={props.albums}>
            {(album, index) => (
              <AlbumCard
                album={album}
                customCoverImage={album.customCoverImage ?? undefined}
                deletingAlbumId={deletingAlbumId()}
                index={index()}
                isInPlayer={isAlbumInPlayer(album)}
                onAddAlbum={props.onAddAlbum}
                onAddTrack={props.onAddTrack}
                onDelete={() => handleDeleteAlbum(album)}
                onEdit={() => handleEdit(album.id)}
                onRemoveTracks={props.onRemoveTracks}
                onPreview={props.onPreview}
                pendingTrackId={props.pendingTrackId}
                playingTrackId={props.playingTrackId}
                trackIds={props.trackIds}
              />
            )}
          </For>
        </div>
      </Show>
      <Show when={deleteErrorMessage()}>
        {(message) => <PFormMessage tone="error">{message()}</PFormMessage>}
      </Show>
      <Show when={isEditorOpen()}>
        <CustomAlbumEditorModal
          albumId={editorAlbumId()}
          isOpen={isEditorOpen()}
          onOpenChange={setIsEditorOpen}
          onSaved={handleSaved}
        />
      </Show>
    </section>
  )
}
