import {createEffect, createMemo, ErrorBoundary, For, Show, Suspense} from 'solid-js'

import {PButton} from '../PButton'
import {reportClientError} from '../../features/client-error-reporter'
import {type PResolvedAlbum, type PTrack, useTrackPreview} from '../../features/focus-room-audio'
import {AlbumCard} from './Card'
import {LoadingStatus} from './LoadingStatus'
import {useAlbumLibrary} from './use-album-library'
import * as m from '@paraglide/message'

export interface PAlbumLibraryContentProps {
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly tracks: readonly PTrack[]
}

interface PublishedCatalogErrorProps {
  readonly error: Error
  readonly isRetrying: boolean
  readonly onRetry: () => void
}

const PublishedCatalogError = (props: PublishedCatalogErrorProps) => {
  createEffect(() => {
    reportClientError(props.error, {feature: 'album-library', source: 'direct'})
  })

  return (
    <div
      class="mb-3 rounded-control border border-solid border-danger/45 bg-danger/10 px-3 py-3
        text-danger"
      role="alert"
    >
      <p class="m-0 text-sm font-650">{m.album_catalog_load_failed()}</p>
      <PButton
        class="mt-2"
        disabled={props.isRetrying}
        onPress={props.onRetry}
        size="small"
        tone="secondary"
      >
        {m.album_retry()}
      </PButton>
    </div>
  )
}

export default function PAlbumLibraryContent(props: PAlbumLibraryContentProps) {
  const albumLibrary = useAlbumLibrary()
  const trackIds = createMemo(() => new Set(props.tracks.map((track) => track.id)))
  const isAlbumInPlayer = (album: PResolvedAlbum) =>
    album.tracks.length > 0 && album.tracks.every((track) => trackIds().has(track.id))
  const handleAlbumAdd = (album: PResolvedAlbum) => props.onAddTracks(album.tracks)
  const handleTrackAdd = (track: PTrack) => props.onAddTracks([track])
  const preview = useTrackPreview({
    onEnd: () => props.onPreviewEnd?.(),
    onStart: (stopPreview) => props.onPreviewStart?.(stopPreview),
  })

  return (
    <>
      <audio
        class="hidden"
        onEnded={preview.handleEnded}
        onError={preview.handleError}
        preload="none"
        ref={(element) => preview.setAudioElement(element)}
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
                  onPress={() => albumLibrary.retryLibrary().then(reset)}
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
        <Suspense fallback={<LoadingStatus />}>
          <Show when={albumLibrary.catalogError()}>
            {(error) => (
              <PublishedCatalogError
                error={error()}
                isRetrying={albumLibrary.isCatalogRetrying()}
                onRetry={albumLibrary.retryCatalog}
              />
            )}
          </Show>
          <Show
            fallback={
              <Show when={albumLibrary.catalogError() === null}>
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
              </Show>
            }
            when={albumLibrary.albums().length > 0}
          >
            <div class="grid gap-3 2xl:grid-cols-2">
              <For each={albumLibrary.albums()}>
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
    </>
  )
}
