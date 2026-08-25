import {
  createMemo,
  createResource,
  createSignal,
  ErrorBoundary,
  For,
  Show,
  Suspense,
} from 'solid-js'

import {PButton} from '../PButton'
import {PModal} from '../PModal'
import {reportClientError} from '../../features/client-error-reporter'
import {
  loadPAlbums,
  type PResolvedAlbum,
  type PTrack,
  useTrackPreview,
} from '../../features/focus-room-audio'
import {AlbumCard} from './Card'
import {PlaylistFooter} from './Footer'
import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'

export interface PAlbumLibraryContentProps {
  readonly isOpen: boolean
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
  readonly onClearTracks?: () => void
  readonly onCloseAutoFocus: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly tracks: readonly PTrack[]
}

export default function PAlbumLibraryContent(props: PAlbumLibraryContentProps) {
  const [albums, {refetch}] = createResource(() => loadPAlbums({locale: getLocale()}))
  const [clearedTracks, setClearedTracks] = createSignal<readonly PTrack[]>([])
  const trackIds = createMemo(() => new Set(props.tracks.map((track) => track.id)))
  const isAlbumInPlayer = (album: PResolvedAlbum) =>
    album.tracks.length > 0 && album.tracks.every((track) => trackIds().has(track.id))
  const addTracks = (tracks: readonly PTrack[]) => {
    setClearedTracks([])
    props.onAddTracks(tracks)
  }
  const handleAlbumAdd = (album: PResolvedAlbum) => addTracks(album.tracks)
  const handleTrackAdd = (track: PTrack) => addTracks([track])
  const handleClearTracks = () => {
    const currentTracks = props.tracks

    if (currentTracks.length === 0 || props.onClearTracks === undefined) {
      return
    }

    setClearedTracks(currentTracks)
    props.onClearTracks()
  }
  const handleRestoreTracks = () => {
    const tracksToRestore = clearedTracks()

    if (tracksToRestore.length === 0) {
      return
    }

    addTracks(tracksToRestore)
  }
  const preview = useTrackPreview({
    onEnd: () => props.onPreviewEnd?.(),
    onStart: (stopPreview) => props.onPreviewStart?.(stopPreview),
  })

  return (
    <PModal
      description={m.album_description()}
      footer={
        <PlaylistFooter
          canClear={props.onClearTracks !== undefined}
          clearedTrackCount={clearedTracks().length}
          onClear={handleClearTracks}
          onRestore={handleRestoreTracks}
          trackCount={props.tracks.length}
        />
      }
      isOpen={props.isOpen}
      onCloseAutoFocus={props.onCloseAutoFocus}
      onOpenChange={props.onOpenChange}
      placement="top"
      size="full"
      title={m.album_title()}
    >
      <audio
        class="hidden"
        onEnded={preview.handleEnded}
        onError={preview.handleError}
        preload="none"
        ref={preview.setAudioElement}
      />
      <Show when={preview.errorMessage()}>
        {(message) => (
          <p
            aria-live="polite"
            class="mb-3 mt-0 rounded-control border border-solid border-danger/45 bg-danger/10
              px-3 py-2 text-xs text-danger"
            role="status"
          >
            {message()}
          </p>
        )}
      </Show>
      <ErrorBoundary
        fallback={(error, reset) => {
          reportClientError(error, {feature: 'album-library', source: 'error-boundary'})

          return (
            <div
              class="grid min-h-32 place-items-center rounded-control border border-dashed
              border-border p-5 text-center"
            >
              <div>
                <span
                  aria-hidden="true"
                  class="i-tabler-music-off mx-auto mb-2 block size-6 text-highlight"
                />
                <p class="m-0 text-sm font-650">{m.album_load_failed()}</p>
                <PButton
                  class="mt-3"
                  onPress={() => {
                    reset()
                    return refetch()
                  }}
                  size="small"
                  tone="secondary"
                >
                  {m.album_retry()}
                </PButton>
              </div>
            </div>
          )
        }}
      >
        <Suspense
          fallback={
            <div class="grid min-h-32 place-items-center text-sm text-muted-foreground">
              {m.album_loading()}
            </div>
          }
        >
          <Show
            fallback={
              <div
                class="grid min-h-32 place-items-center rounded-control border border-dashed
                  border-border p-5 text-center"
              >
                <div>
                  <span
                    aria-hidden="true"
                    class="i-tabler-music-off mx-auto mb-2 block size-6 text-highlight"
                  />
                  <p class="m-0 text-sm font-650">{m.album_empty()}</p>
                </div>
              </div>
            }
            when={(albums() ?? []).length > 0}
          >
            <div class="grid gap-3 2xl:grid-cols-2">
              <For each={albums() ?? []}>
                {(album, index) => (
                  <AlbumCard
                    album={album}
                    index={index()}
                    isInPlayer={isAlbumInPlayer(album)}
                    onAddAlbum={handleAlbumAdd}
                    onAddTrack={handleTrackAdd}
                    onPreview={(request) => {
                      preview.togglePreview(request).catch((error: unknown) => {
                        console.error('Failed to toggle album track preview.', error)
                      })
                    }}
                    pendingTrackId={preview.pendingTrackId()}
                    playingTrackId={preview.playingTrackId()}
                    trackIds={trackIds()}
                  />
                )}
              </For>
            </div>
          </Show>
        </Suspense>
      </ErrorBoundary>
    </PModal>
  )
}
