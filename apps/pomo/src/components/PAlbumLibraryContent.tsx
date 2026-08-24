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
import {reportClientError} from '../features/client-error-reporter'
import {loadPAlbums, type PResolvedAlbum, type PTrack} from '../features/focus-room-audio'

export interface PAlbumLibraryContentProps {
  readonly isOpen: boolean
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
  readonly onCloseAutoFocus: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly tracks: readonly PTrack[]
}

const PREVIEW_TRACK_COUNT = 4
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

const AlbumSummary = (props: {
  readonly album: PResolvedAlbum
  readonly expanded: boolean
  readonly expandable: boolean
  readonly index: number
}) => (
  <div class="flex gap-3.5 p-4">
    <div
      aria-hidden="true"
      class={[
        'grid size-16 flex-none place-items-center rounded-4 text-white shadow-panel',
        ALBUM_ART_CLASSES[props.index % ALBUM_ART_CLASSES.length],
      ].join(' ')}
    >
      <span class={`${props.album.icon} size-6.5 opacity-90`} />
    </div>
    <div class="min-w-0 flex-1 py-0.5">
      <h3 class="m-0 truncate text-base font-750 leading-5 text-foreground">{props.album.title}</h3>
      <p class="mb-0 mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {props.album.description}
      </p>
      <Show when={props.album.tracks.length > 0}>
        <p class="mb-0 mt-2 flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
          <span aria-hidden="true" class="i-tabler-music size-3.5" />
          <span>{props.album.tracks.length}곡</span>
          <span aria-hidden="true" class="opacity-50">
            ·
          </span>
          <span>{formatDuration(props.album.tracks)}</span>
        </p>
      </Show>
    </div>
    <Show when={props.expandable}>
      <span
        aria-hidden="true"
        class={[
          'i-tabler-chevron-down mt-1 size-4 flex-none text-muted-foreground',
          'transition-transform motion-reduce:transition-none',
          props.expanded ? 'rotate-180' : '',
        ].join(' ')}
      />
    </Show>
  </div>
)

const AlbumCard = (props: {
  readonly album: PResolvedAlbum
  readonly index: number
  readonly isInPlayer: boolean
  readonly onAddAlbum: (album: PResolvedAlbum) => void
  readonly onAddTrack: (track: PTrack) => void
  readonly trackIds: ReadonlySet<string>
}) => {
  const [isExpanded, setIsExpanded] = createSignal(false)
  const hasMoreTracks = () => props.album.tracks.length > PREVIEW_TRACK_COUNT
  const hiddenTrackCount = () => props.album.tracks.length - PREVIEW_TRACK_COUNT
  const visibleTracks = () =>
    isExpanded() ? props.album.tracks : props.album.tracks.slice(0, PREVIEW_TRACK_COUNT)
  const toggleExpanded = () => {
    if (hasMoreTracks()) {
      setIsExpanded((expanded) => !expanded)
    }
  }

  return (
    <article class={ALBUM_CARD_CLASSES.join(' ')}>
      <Show
        fallback={
          <AlbumSummary
            album={props.album}
            expanded={false}
            expandable={false}
            index={props.index}
          />
        }
        when={hasMoreTracks()}
      >
        <div
          aria-controls={`${props.album.id}-tracks`}
          aria-expanded={isExpanded()}
          aria-label={`${props.album.title} 곡 목록 ${isExpanded() ? '접기' : '전체 보기'}`}
          class="cursor-pointer outline-none transition-colors hover:bg-surface
            focus-visible:shadow-focus motion-reduce:transition-none"
          onClick={toggleExpanded}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') {
              return
            }

            event.preventDefault()
            toggleExpanded()
          }}
          role="button"
          tabIndex={0}
        >
          <AlbumSummary
            album={props.album}
            expanded={isExpanded()}
            expandable={true}
            index={props.index}
          />
        </div>
      </Show>
      <Show
        fallback={
          <div
            class="flex items-center gap-2 border-t border-solid border-border px-4 py-3 text-xs
              text-muted-foreground"
          >
            <span aria-hidden="true" class="i-tabler-clock-hour-4 size-4 text-highlight" />
            <span>수록곡을 준비하고 있어요</span>
          </div>
        }
        when={props.album.tracks.length > 0}
      >
        <div class="border-t border-solid border-border px-4 py-3" id={`${props.album.id}-tracks`}>
          <div class="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
            <For each={visibleTracks()}>
              {(track, trackIndex) => {
                const isInPlayer = () => props.trackIds.has(track.id)

                return (
                  <div class="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <span class="w-3 flex-none text-center tabular-nums opacity-50">
                      {trackIndex() + 1}
                    </span>
                    <span class="min-w-0 flex-1 truncate">{track.title}</span>
                    <button
                      aria-label={
                        isInPlayer()
                          ? `${track.title}, 플레이어에 있음`
                          : `${track.title} 플레이어에 추가`
                      }
                      class="grid size-8 flex-none cursor-pointer place-items-center
                        rounded-control border border-solid border-border bg-transparent
                        text-highlight outline-none transition-colors hover:border-border-hover
                        hover:bg-surface focus-visible:shadow-focus disabled:cursor-not-allowed
                        disabled:opacity-45 disabled:hover:border-border
                        disabled:hover:bg-transparent motion-reduce:transition-none"
                      disabled={isInPlayer()}
                      onClick={() => props.onAddTrack(track)}
                      title={isInPlayer() ? '플레이어에 있음' : '플레이어에 추가'}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        class={isInPlayer() ? 'i-tabler-check size-4' : 'i-tabler-plus size-4'}
                      />
                    </button>
                  </div>
                )
              }}
            </For>
            <Show when={hasMoreTracks()}>
              <button
                class="col-span-full flex min-h-8 cursor-pointer items-center justify-center gap-1.5
                  rounded-3 border-0 bg-transparent px-3 text-xs font-650 text-highlight
                  outline-none transition-colors hover:bg-surface focus-visible:shadow-focus
                  sm:col-span-2 motion-reduce:transition-none"
                onClick={toggleExpanded}
                type="button"
              >
                <span>{isExpanded() ? '곡 목록 접기' : `더 많은 곡 ${hiddenTrackCount()}개`}</span>
                <span
                  aria-hidden="true"
                  class={
                    isExpanded() ? 'i-tabler-chevron-up size-4' : 'i-tabler-chevron-down size-4'
                  }
                />
              </button>
            </Show>
          </div>
        </div>
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
    </article>
  )
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
