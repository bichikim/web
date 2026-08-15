import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'

import type {PTrack} from '../features/focus-room-audio/focus-room-playlist'

export interface PTrackListProps {
  readonly currentIndex: number
  readonly onTrackSelect: (index: number) => void
  readonly tracks: readonly PTrack[]
}

export const PTrackList = (props: PTrackListProps) => (
  <Show when={props.tracks.length > 1}>
    <ol
      class={cx(
        'pomo-player__playlist mb-0 mt-[var(--pomo-padding-md)] grid min-w-0',
        'grid-cols-[minmax(0,1fr)] max-h-38 list-none overflow-auto',
        'gap-[var(--pomo-padding-xs)] p-[var(--pomo-padding-xs)]',
      )}
    >
      <For each={props.tracks}>
        {(track, index) => (
          <li class="min-w-0">
            <button
              aria-current={index() === props.currentIndex ? 'true' : undefined}
              class={cx(
                'pomo-player__track box-border flex min-w-0 w-full items-center rounded-3',
                'gap-[var(--pomo-padding-md)]',
                'px-[var(--pomo-padding-md)] py-2.5 text-left text-xs transition',
                index() === props.currentIndex
                  ? 'bg-[var(--pomo-accent-soft)] text-[var(--pomo-text)]'
                  : 'text-[var(--pomo-text-muted)] hover:bg-[var(--pomo-secondary-soft)]',
              )}
              onClick={() => props.onTrackSelect(index())}
              type="button"
            >
              <span class="w-4 text-center tabular-nums">{index() + 1}</span>
              <span class="min-w-0 flex-1 truncate">{track.title}</span>
              <span class="min-w-0 max-w-[40%] truncate opacity-70">{track.artist}</span>
            </button>
          </li>
        )}
      </For>
    </ol>
  </Show>
)
