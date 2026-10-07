import {useResizeObserver} from 'src/hooks/use-resize-observer'
import {useAction, useSubmissions} from '@solidjs/router'
import {createMemo, createSignal, For, onCleanup, onMount, Show} from 'solid-js'
import {PTag} from '../p-tag/PTag'
import {
  type PTrack,
  type PTrackListing,
  type PTrackPreviewRequest,
  requestTrackAccessAction,
  resolveTrackPreviewAccess,
} from '../../features/focus-room-audio'
import * as m from '@paraglide/message'
import {PreviewButton} from './PreviewButton'

interface PAlbumTrackListProps {
  readonly albumTitle: string
  readonly onAddTrack: (track: PTrack) => void
  readonly onRemoveTracks?: (trackIds: ReadonlySet<string>) => void
  readonly onPreview: (request: PTrackPreviewRequest) => void
  readonly pendingTrackId: string | null
  readonly playableTracks: readonly PTrack[]
  readonly playingTrackId: string | null
  readonly trackIds: ReadonlySet<string>
  readonly tracks: readonly PTrackListing[]
}

interface TrackQueueButtonProps {
  readonly isInPlayer: boolean
  readonly onAddTrack: (track: PTrack) => void
  readonly onRemoveTracks?: (trackIds: ReadonlySet<string>) => void
  readonly playableTrack?: PTrack
  readonly title: string
  readonly trackId: string
}

const TrackQueueButton = (props: TrackQueueButtonProps) => (
  <Show when={props.playableTrack || props.isInPlayer}>
    <button
      aria-label={
        props.isInPlayer
          ? props.onRemoveTracks === undefined
            ? m.album_track_in_player({title: props.title})
            : m.album_track_remove({title: props.title})
          : m.album_track_add({title: props.title})
      }
      class="grid size-8 flex-none cursor-pointer place-items-center rounded-control border
        border-solid border-border bg-transparent text-highlight outline-none
        transition-colors hover:border-border-hover hover:bg-surface focus-visible:shadow-focus
        disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border
        disabled:hover:bg-transparent motion-reduce:transition-none"
      disabled={props.isInPlayer && props.onRemoveTracks === undefined}
      onClick={() => {
        if (props.isInPlayer) {
          props.onRemoveTracks?.(new Set([props.trackId]))
          return
        }

        if (props.playableTrack !== undefined) {
          props.onAddTrack(props.playableTrack)
        }
      }}
      type="button"
    >
      <span
        aria-hidden="true"
        class={props.isInPlayer ? 'i-tabler-check size-4' : 'i-tabler-plus size-4'}
      />
    </button>
  </Show>
)

export const PAlbumTrackList = (props: PAlbumTrackListProps) => {
  const requestTrackAccess = useAction(requestTrackAccessAction)
  const accessSubmissions = useSubmissions(requestTrackAccessAction)
  const [hasMoreBelow, setHasMoreBelow] = createSignal(false)
  let listElement!: HTMLOListElement

  const updateOverflow = () => {
    const list = listElement

    setHasMoreBelow(list.scrollTop + list.clientHeight < list.scrollHeight - 1)
  }

  onMount(() => {
    const list = listElement

    updateOverflow()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateOverflow)
      onCleanup(() => window.removeEventListener('resize', updateOverflow))
      return
    }

    const observer = useResizeObserver({onResize: updateOverflow, target: () => list})
    observer.start()
  })

  return (
    <div class="relative border-t border-solid border-border px-4 py-3">
      <ol
        aria-label={m.album_track_list({title: props.albumTitle})}
        class="m-0 grid max-h-[10.5rem] list-none gap-x-5 overflow-y-auto overscroll-auto
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
            const isPreviewLimitVisible = () =>
              isPreviewing() && props.pendingTrackId !== track.id && isLimited()
            const isAccessPending = () =>
              accessSubmissions.some(
                (submission) => submission.pending && submission.input[0] === track.id,
              )

            return (
              <li class="flex min-w-0 items-center gap-2 py-1 text-sm leading-5 text-muted-foreground">
                <span class="w-3 flex-none text-center tabular-nums opacity-50">
                  {trackIndex() + 1}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-foreground">{track.title}</span>
                  <Show when={track.artist.length > 0 || isPreviewLimitVisible()}>
                    <span class="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm leading-5">
                      <Show when={track.artist.length > 0}>
                        <span class="min-w-0 truncate">{track.artist}</span>
                      </Show>
                      <Show when={isPreviewLimitVisible()}>
                        <PTag class="flex-none" tone="highlight">
                          {m.album_preview_limited()}
                        </PTag>
                      </Show>
                    </span>
                  </Show>
                </span>
                <PreviewButton
                  isLimited={isLimited()}
                  isPending={props.pendingTrackId === track.id || isAccessPending()}
                  isPlaying={isPreviewing()}
                  onPress={() => {
                    const playable = playableTrack()
                    props.onPreview(
                      playable === undefined
                        ? {
                            id: track.id,
                            loadSource: async () => {
                              try {
                                const result = await requestTrackAccess(track.id)

                                switch (result.status) {
                                  case 'authentication-required':
                                    return {ok: false, reason: 'authentication-required'}
                                  case 'granted':
                                    return resolveTrackPreviewAccess(result.access, track.id)
                                  case 'unavailable':
                                    throw new Error('Track access request is unavailable')
                                }
                              } finally {
                                accessSubmissions
                                  .findLast(
                                    (submission) =>
                                      !submission.pending && submission.input[0] === track.id,
                                  )
                                  ?.clear()
                              }
                            },
                          }
                        : {id: track.id, source: playable.source},
                    )
                  }}
                  title={track.title}
                />
                <TrackQueueButton
                  isInPlayer={isInPlayer()}
                  onAddTrack={props.onAddTrack}
                  onRemoveTracks={props.onRemoveTracks}
                  playableTrack={playableTrack()}
                  title={track.title}
                  trackId={track.id}
                />
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
