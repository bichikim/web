import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'

import type {PTrack} from '../features/focus-room-audio'

const CLASSES = {
  playerPlaylist: [
    'pomo-player__playlist pt-1.5',
    'bg-[linear-gradient(180deg,_rgb(255_250_241_/_2%),_transparent_1.5rem)]',
    '[scrollbar-color:rgb(255_250_241_/_18%)_transparent] [scrollbar-width:thin]',
  ].join(' '),
  playerTrack: [
    'pomo-player__track text-muted-foreground',
    "[&[aria-current='true']]:text-foreground",
    "[&[aria-current='true']]:shadow-track-active",
    '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid [&:focus-visible]:outline-primary',
    '[&:focus-visible]:[outline-offset:2px]',
  ].join(' '),
} as const

export interface PTrackListProps {
  readonly currentIndex: number
  readonly onTrackSelect: (index: number) => void
  readonly tracks: readonly PTrack[]
}

export const PTrackList = (props: PTrackListProps) => (
  <Show when={props.tracks.length > 1}>
    <ol
      class={cx(
        CLASSES.playerPlaylist,
        'mb-0 mt-3 grid min-w-0',
        'grid-cols-[minmax(0,1fr)] max-h-38 list-none overflow-auto',
        'gap-1 p-1',
      )}
    >
      <For each={props.tracks}>
        {(track, index) => (
          <li class="min-w-0">
            <button
              aria-current={index() === props.currentIndex ? 'true' : undefined}
              class={cx(
                CLASSES.playerTrack,
                'box-border flex min-w-0 w-full items-center rounded-3',
                'gap-3',
                'px-3 py-2.5 text-left text-xs transition',
                index() === props.currentIndex
                  ? 'bg-primary-soft text-foreground'
                  : 'text-muted-foreground hover:bg-secondary-soft',
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
