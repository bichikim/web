import {createMemo, createSignal, For, onCleanup, onMount, Show} from 'solid-js'

import {PTag} from '../design-system/PTag'
import {
  loadTrackPreviewSource,
  type PTrack,
  type PTrackListing,
  type PTrackPreviewRequest,
} from '../features/focus-room-audio'

interface PreviewButtonProps {
  readonly isLimited: boolean
  readonly isPending: boolean
  readonly isPlaying: boolean
  readonly onPress: () => void
  readonly title: string
}

const PreviewButton = (props: PreviewButtonProps) => (
  <button
    aria-label={`${props.title} ${props.isLimited ? '30초 ' : ''}미리듣기${
      props.isPlaying ? ' 정지' : ''
    }`}
    aria-pressed={props.isPlaying}
    class="grid size-8 flex-none cursor-pointer place-items-center rounded-control border
      border-solid border-border bg-transparent text-highlight outline-none transition-colors
      hover:border-border-hover hover:bg-surface focus-visible:shadow-focus
      motion-reduce:transition-none"
    onClick={() => props.onPress()}
    title={props.isPlaying ? '미리듣기 정지' : props.isLimited ? '30초 미리듣기' : '미리듣기'}
    type="button"
  >
    <span
      aria-hidden="true"
      class={
        props.isPending
          ? 'i-tabler-loader-2 size-4 animate-spin motion-reduce:animate-none'
          : props.isPlaying
            ? 'i-tabler-player-stop size-4'
            : 'i-tabler-player-play size-4'
      }
    />
  </button>
)

interface PAlbumTrackListProps {
  readonly albumTitle: string
  readonly onAddTrack: (track: PTrack) => void
  readonly onPreview: (request: PTrackPreviewRequest) => void
  readonly pendingTrackId: string | null
  readonly playableTracks: readonly PTrack[]
  readonly playingTrackId: string | null
  readonly trackIds: ReadonlySet<string>
  readonly tracks: readonly PTrackListing[]
}

export const PAlbumTrackList = (props: PAlbumTrackListProps) => {
  const [hasMoreBelow, setHasMoreBelow] = createSignal(false)
  let listElement: HTMLOListElement | undefined

  const updateOverflow = () => {
    const list = listElement

    if (list === undefined) {
      return
    }

    setHasMoreBelow(list.scrollTop + list.clientHeight < list.scrollHeight - 1)
  }

  onMount(() => {
    const list = listElement

    if (list === undefined) {
      return
    }

    updateOverflow()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateOverflow)
      onCleanup(() => window.removeEventListener('resize', updateOverflow))
      return
    }

    const observer = new ResizeObserver(updateOverflow)
    observer.observe(list)
    onCleanup(() => observer.disconnect())
  })

  return (
    <div class="relative border-t border-solid border-border px-4 py-3">
      <ol
        aria-label={`${props.albumTitle} 수록곡`}
        class="m-0 grid max-h-[10.5rem] list-none gap-x-5 overflow-y-auto overscroll-contain
          p-0 pr-1 outline-none [scrollbar-gutter:stable] focus-visible:shadow-focus
          sm:max-h-[5.25rem] sm:grid-cols-2 2xl:max-h-[10.5rem] 2xl:grid-cols-1"
        onScroll={updateOverflow}
        ref={(element) => {
          listElement = element
        }}
        tabIndex={0}
      >
        <For each={props.tracks}>
          {(track, trackIndex) => {
            const playableTrack = createMemo(() =>
              props.playableTracks.find((candidate) => candidate.id === track.id),
            )
            const isInPlayer = () => props.trackIds.has(track.id)
            const isPreviewing = () => props.playingTrackId === track.id
            const isLimited = () => playableTrack() === undefined

            return (
              <li class="flex min-w-0 items-center gap-2 py-1 text-xs text-muted-foreground">
                <span class="w-3 flex-none text-center tabular-nums opacity-50">
                  {trackIndex() + 1}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-foreground">{track.title}</span>
                  <span class="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.6875rem]">
                    <span class="min-w-0 truncate">{track.artist}</span>
                    <Show when={isPreviewing() && props.pendingTrackId !== track.id && isLimited()}>
                      <PTag class="flex-none" tone="highlight">
                        30초 미리듣기
                      </PTag>
                    </Show>
                  </span>
                </span>
                <PreviewButton
                  isLimited={isLimited()}
                  isPending={props.pendingTrackId === track.id}
                  isPlaying={isPreviewing()}
                  onPress={() => {
                    const playable = playableTrack()
                    props.onPreview(
                      playable === undefined
                        ? {id: track.id, loadSource: () => loadTrackPreviewSource(track.id)}
                        : {id: track.id, source: playable.source},
                    )
                  }}
                  title={track.title}
                />
                <Show when={playableTrack()}>
                  {(playable) => (
                    <>
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
                        onClick={() => props.onAddTrack(playable())}
                        title={isInPlayer() ? '플레이어에 있음' : '플레이어에 추가'}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          class={isInPlayer() ? 'i-tabler-check size-4' : 'i-tabler-plus size-4'}
                        />
                      </button>
                    </>
                  )}
                </Show>
              </li>
            )
          }}
        </For>
      </ol>
      <Show when={hasMoreBelow()}>
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-4 bottom-3 flex h-8 items-end justify-center
            bg-gradient-to-b from-transparent to-surface-interactive pb-0.5 text-highlight"
        >
          <span class="i-tabler-chevron-down size-4 animate-bounce motion-reduce:animate-none" />
        </div>
      </Show>
    </div>
  )
}
