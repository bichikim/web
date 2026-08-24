import {createSignal, For, Show} from 'solid-js'
import {PButton} from '../../design-system/PButton'
import {type PResolvedAlbum, type PTrack} from '../../features/focus-room-audio/index'
import {AlbumSummary} from './Summary'

const PREVIEW_TRACK_COUNT = 4

const ALBUM_CARD_CLASSES = [
  'overflow-hidden rounded-panel-inner border border-solid border-border',
  'bg-surface-interactive',
] as const

export const AlbumCard = (props: {
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
