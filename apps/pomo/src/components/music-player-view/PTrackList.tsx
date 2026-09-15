import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'
import * as m from '@paraglide/message'

import type {PTrack} from '../../features/focus-room-audio'
import {PSwipeTrackItem} from './PSwipeTrackItem'

const CLASSES = {
  playerPlaylist: cx(
    'pt-1.5',
    'bg-[linear-gradient(180deg,_rgb(255_250_241_/_2%),_transparent_1.5rem)]',
    '[scrollbar-color:rgb(255_250_241_/_18%)_transparent] [scrollbar-width:thin]',
  ),
} as const

export interface PTrackListProps {
  readonly currentIndex: number
  readonly isPlaylistLoading: boolean
  readonly onTrackRemove?: (index: number) => void
  readonly onTrackSelect: (index: number) => void
  readonly tracks: readonly PTrack[]
}

const PlaylistLoadingStatus = () => (
  <div class="min-w-0 rounded-3 px-3 py-2 text-sm text-muted-foreground player-compact:px-2">
    <div
      aria-live="polite"
      class="flex min-w-0 items-center gap-3 player-compact:gap-2"
      role="status"
    >
      <span
        aria-hidden="true"
        class="i-tabler-loader-2 size-4 flex-none animate-spin motion-reduce:animate-none"
      />
      <span class="truncate">{m.player_fallback_title()}</span>
    </div>
  </div>
)

export const PTrackList = (props: PTrackListProps) => (
  <Show when={props.tracks.length > 0 || props.isPlaylistLoading}>
    <>
      <Show when={props.isPlaylistLoading}>
        <PlaylistLoadingStatus />
      </Show>
      <Show when={props.tracks.length > 0}>
        <ol
          aria-busy={props.isPlaylistLoading ? 'true' : undefined}
          class={cx(
            CLASSES.playerPlaylist,
            'mb-0 mt-3 grid min-h-0 min-w-0 flex-1 player-compact:mt-2',
            'grid-cols-[minmax(0,1fr)] max-h-38 player-compact:max-h-none list-none overflow-auto',
            'gap-1 p-1',
          )}
        >
          <For each={props.tracks}>
            {(track, index) => (
              <PSwipeTrackItem
                current={index() === props.currentIndex}
                index={index()}
                onRemove={
                  props.onTrackRemove === undefined
                    ? undefined
                    : () => props.onTrackRemove?.(index())
                }
                onSelect={() => props.onTrackSelect(index())}
                track={track}
              />
            )}
          </For>
        </ol>
      </Show>
    </>
  </Show>
)
