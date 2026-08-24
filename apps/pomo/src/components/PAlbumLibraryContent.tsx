import {createMemo, createResource, ErrorBoundary, For, Show, Suspense} from 'solid-js'

import {PButton} from '../design-system/PButton'
import {PModal} from '../design-system/PModal'
import {reportClientError} from '../features/client-error-reporter'
import {loadPAlbums, type PResolvedAlbum, type PTrack} from '../features/focus-room-audio'
import {AlbumCard} from './album-library/Card'

export interface PAlbumLibraryContentProps {
  readonly isOpen: boolean
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
  readonly onCloseAutoFocus: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly tracks: readonly PTrack[]
}

export default function PAlbumLibraryContent(props: PAlbumLibraryContentProps) {
  const [albums, {refetch}] = createResource(() => loadPAlbums())
  const trackIds = createMemo(() => new Set(props.tracks.map((track) => track.id)))
  const isAlbumInPlayer = (album: PResolvedAlbum) =>
    album.tracks.length > 0 && album.tracks.every((track) => trackIds().has(track.id))
  const handleAlbumAdd = (album: PResolvedAlbum) => props.onAddTracks(album.tracks)
  const handleTrackAdd = (track: PTrack) => props.onAddTracks([track])

  return (
    <PModal
      description="곡 하나씩 또는 앨범 전체를 플레이어에 담아보세요."
      isOpen={props.isOpen}
      onCloseAutoFocus={props.onCloseAutoFocus}
      onOpenChange={props.onOpenChange}
      placement="top"
      size="wide"
      title="앨범"
    >
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
                <p class="m-0 text-sm font-650">앨범을 불러오지 못했어요</p>
                <PButton
                  class="mt-3"
                  onPress={() => {
                    reset()
                    return refetch()
                  }}
                  size="small"
                  tone="secondary"
                >
                  다시 시도
                </PButton>
              </div>
            </div>
          )
        }}
      >
        <Suspense
          fallback={
            <div class="grid min-h-32 place-items-center text-sm text-muted-foreground">
              앨범 불러오는 중
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
                  <p class="m-0 text-sm font-650">등록된 앨범이 없어요</p>
                </div>
              </div>
            }
            when={(albums() ?? []).length > 0}
          >
            <div class="grid gap-3">
              <For each={albums() ?? []}>
                {(album, index) => (
                  <AlbumCard
                    album={album}
                    index={index()}
                    isInPlayer={isAlbumInPlayer(album)}
                    onAddAlbum={handleAlbumAdd}
                    onAddTrack={handleTrackAdd}
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
