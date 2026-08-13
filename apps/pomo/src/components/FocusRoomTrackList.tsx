import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'

import type {FocusRoomTrack} from '../features/focus-room-audio/focus-room-playlist'

export interface FocusRoomTrackListProps {
  readonly currentIndex: number
  readonly onTrackSelect: (index: number) => void
  readonly tracks: readonly FocusRoomTrack[]
}

export const FocusRoomTrackList = (props: FocusRoomTrackListProps) => (
  <Show when={props.tracks.length > 1}>
    <ol class="focus-room-player__playlist mb-0 mt-3 grid max-h-38 list-none gap-1 overflow-auto p-1">
      <For each={props.tracks}>
        {(track, index) => (
          <li>
            <button
              aria-current={index() === props.currentIndex ? 'true' : undefined}
              class={cx(
                'focus-room-player__track flex w-full items-center gap-3 rounded-3',
                'px-3 py-2.5 text-left text-xs transition',
                index() === props.currentIndex
                  ? 'bg-[var(--focus-room-accent-soft)] text-[var(--focus-room-text)]'
                  : 'text-[var(--focus-room-text-muted)] hover:bg-[var(--focus-room-secondary-soft)]',
              )}
              onClick={() => props.onTrackSelect(index())}
              type="button"
            >
              <span class="w-4 text-center tabular-nums">{index() + 1}</span>
              <span class="min-w-0 flex-1 truncate">{track.title}</span>
              <span class="truncate opacity-70">{track.artist}</span>
            </button>
          </li>
        )}
      </For>
    </ol>
  </Show>
)
