import {
  createMemo,
  createResource,
  createSignal,
  ErrorBoundary,
  For,
  Show,
  Suspense,
} from 'solid-js'

import {PButton} from '../design-system/PButton'
import {PModal} from '../design-system/PModal'
import {
  loadPAlbums,
  type PAlbumSale,
  type PResolvedAlbum,
  type PTrack,
  type PTrackListing,
  type PTrackPreviewRequest,
  useTrackPreview,
} from '../features/focus-room-audio'
import {PAlbumTrackList} from './PAlbumTrackList'

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

const SECONDS_PER_MINUTE = 60

const formatDuration = (tracks: readonly PTrack[]) => {
  const durationSeconds = Math.round(
    tracks.reduce((total, track) => total + track.durationSeconds, 0),
  )
  const minutes = Math.floor(durationSeconds / SECONDS_PER_MINUTE)
  const seconds = durationSeconds % SECONDS_PER_MINUTE

  return `${minutes}분 ${seconds.toString().padStart(2, '0')}초`
}

const ALBUM_ART_CLASSES = [
  [
    'bg-[radial-gradient(circle_at_28%_24%,rgb(255_244_201_/_80%),transparent_28%),',
    'linear-gradient(145deg,#d48c63,#7b493a)]',
  ].join(''),
  [
    'bg-[radial-gradient(circle_at_72%_20%,rgb(255_222_164_/_72%),transparent_30%),',
    'linear-gradient(145deg,#9b9070,#4c5042)]',
  ].join(''),
  [
    'bg-[radial-gradient(circle_at_38%_18%,rgb(213_224_201_/_52%),transparent_26%),',
    'linear-gradient(145deg,#596b62,#242d2b)]',
  ].join(''),
] as const

const ALBUM_CARD_CLASSES = [
  'overflow-hidden rounded-panel-inner border border-solid border-border',
  'bg-surface-interactive',
] as const

const AlbumSummary = (props: {readonly album: PResolvedAlbum; readonly index: number}) => (
  <div class="flex gap-3.5 p-4">
    <Show
      fallback={
        <div
          aria-hidden="true"
          class={[
            'grid size-16 flex-none place-items-center rounded-4 text-white shadow-panel',
            ALBUM_ART_CLASSES[props.index % ALBUM_ART_CLASSES.length],
          ].join(' ')}
        >
          <span class={`${props.album.icon} size-6.5 opacity-90`} />
        </div>
      }
      when={props.album.coverImageUrl}
    >
      {(coverImageUrl) => (
        <img
          alt={`${props.album.title} 앨범 커버`}
          class="size-16 flex-none rounded-4 object-cover shadow-panel"
          src={coverImageUrl()}
        />
      )}
    </Show>
    <div class="min-w-0 flex-1 py-0.5">
      <h3 class="m-0 truncate text-base font-750 leading-5 text-foreground">{props.album.title}</h3>
      <p class="mb-0 mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {props.album.description}
      </p>
      <Show when={(props.album.trackCount ?? props.album.tracks.length) > 0}>
        <p class="mb-0 mt-2 flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
          <span aria-hidden="true" class="i-tabler-music size-3.5" />
          <span>{props.album.trackCount ?? props.album.tracks.length}곡</span>
          <Show when={props.album.tracks.length > 0}>
            <span aria-hidden="true" class="opacity-50">
              ·
            </span>
            <span>{formatDuration(props.album.tracks)}</span>
          </Show>
        </p>
      </Show>
    </div>
  </div>
)

interface AlbumSaleStatusProps {
  readonly sale: PAlbumSale
}

const AlbumSaleStatus = (props: AlbumSaleStatusProps) => (
  <div class="flex items-center justify-between gap-3 border-t border-solid border-border px-4 py-3">
    <Show when={props.sale.priceLabel}>
      {(priceLabel) => <span class="text-sm font-750 text-foreground">{priceLabel()}</span>}
    </Show>
    <span class="ml-auto text-xs font-700 text-highlight">{props.sale.statusLabel}</span>
  </div>
)

interface PlaylistFooterProps {
  readonly canClear: boolean
  readonly clearedTrackCount: number
  readonly onClear: () => void
  readonly onRestore: () => void
  readonly trackCount: number
}

const PlaylistFooter = (props: PlaylistFooterProps) => (
  <Show when={props.canClear && (props.trackCount > 0 || props.clearedTrackCount > 0)}>
    <Show
      fallback={
        <div class="flex min-h-11 items-center justify-between gap-4">
          <span class="text-sm text-muted-foreground">
            현재 재생목록 <strong class="font-750 text-foreground">{props.trackCount}곡</strong>
          </span>
          <button
            aria-label="재생목록 모두 비우기"
            class="min-h-11 cursor-pointer rounded-control border-0 bg-transparent px-3 text-sm
              font-700 text-muted-foreground outline-none transition-colors hover:bg-danger/10
              hover:text-danger focus-visible:shadow-focus motion-reduce:transition-none"
            onClick={() => props.onClear()}
            type="button"
          >
            비우기
          </button>
        </div>
      }
      when={props.trackCount === 0 && props.clearedTrackCount > 0}
    >
      <div
        aria-live="polite"
        class="flex min-h-11 items-center justify-between gap-4"
        role="status"
      >
        <span class="text-sm text-muted-foreground">재생목록을 비웠어요</span>
        <button
          class="min-h-11 cursor-pointer rounded-control border-0 bg-transparent px-3 text-sm
            font-750 text-highlight outline-none transition-colors hover:bg-surface
            focus-visible:shadow-focus motion-reduce:transition-none"
          onClick={() => props.onRestore()}
          type="button"
        >
          되돌리기
        </button>
      </div>
    </Show>
  </Show>
)

const AlbumCard = (props: {
  readonly album: PResolvedAlbum
  readonly index: number
  readonly isInPlayer: boolean
  readonly onAddAlbum: (album: PResolvedAlbum) => void
  readonly onAddTrack: (track: PTrack) => void
  readonly onPreview: (request: PTrackPreviewRequest) => void
  readonly pendingTrackId: string | null
  readonly playingTrackId: string | null
  readonly trackIds: ReadonlySet<string>
}) => {
  const listedTracks = (): readonly PTrackListing[] =>
    props.album.trackListings ?? props.album.tracks

  return (
    <article class={ALBUM_CARD_CLASSES.join(' ')}>
      <AlbumSummary album={props.album} index={props.index} />
      <Show when={listedTracks().length > 0}>
        <PAlbumTrackList
          albumTitle={props.album.title}
          onAddTrack={props.onAddTrack}
          onPreview={props.onPreview}
          pendingTrackId={props.pendingTrackId}
          playableTracks={props.album.sale === undefined ? props.album.tracks : []}
          playingTrackId={props.playingTrackId}
          trackIds={props.trackIds}
          tracks={listedTracks()}
        />
      </Show>
      <Show when={props.album.sale === undefined && props.album.tracks.length === 0}>
        <div
          class="flex items-center gap-2 border-t border-solid border-border px-4 py-3 text-xs
            text-muted-foreground"
        >
          <span aria-hidden="true" class="i-tabler-clock-hour-4 size-4 text-highlight" />
          <span>수록곡을 준비하고 있어요</span>
        </div>
      </Show>
      <Show when={props.album.sale === undefined && props.album.tracks.length > 0}>
        <div class="px-4 pb-4">
          <PButton
            class="w-full"
            disabled={props.isInPlayer}
            icon="i-tabler-playlist-add"
            onPress={() => props.onAddAlbum(props.album)}
            size="small"
            tone={props.isInPlayer ? 'secondary' : 'primary'}
          >
            앨범 모두 추가
          </PButton>
        </div>
      </Show>
      <Show when={props.album.sale}>{(sale) => <AlbumSaleStatus sale={sale()} />}</Show>
    </article>
  )
}

export default function PAlbumLibraryContent(props: PAlbumLibraryContentProps) {
  const [albums, {refetch}] = createResource(() => loadPAlbums())
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
      description="곡 하나씩 또는 앨범 전체를 플레이어에 담아보세요."
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
      title="앨범"
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
        fallback={(_error, reset) => (
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
        )}
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
