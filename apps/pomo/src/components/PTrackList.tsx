import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'

import type {PTrack} from '../features/focus-room-audio'
import {PSwipeTrackItem} from './PSwipeTrackItem'

const CLASSES = {
  playerPlaylist: [
    'pomo-player__playlist pt-1.5',
    'bg-[linear-gradient(180deg,_rgb(255_250_241_/_2%),_transparent_1.5rem)]',
    '[scrollbar-color:rgb(255_250_241_/_18%)_transparent] [scrollbar-width:thin]',
  ].join(' '),
} as const

export interface PTrackListProps {
  readonly currentIndex: number
  readonly onTrackRemove?: (index: number) => void
  readonly onTrackSelect: (index: number) => void
  readonly tracks: readonly PTrack[]
}

export const PTrackList = (props: PTrackListProps) => (
  <Show when={props.tracks.length > 0}>
    <ol
      class={cx(
        CLASSES.playerPlaylist,
        'mb-0 mt-3 grid min-h-0 min-w-0 flex-1 player-compact:mt-2',
        'grid-cols-[minmax(0,1fr)] max-h-38 list-none overflow-auto',
        'gap-1 p-1',
      )}
    >
      <For each={props.tracks}>
        {(track, index) => (
          <PSwipeTrackItem
            current={index() === props.currentIndex}
            index={index()}
            onRemove={
              props.onTrackRemove === undefined ? undefined : () => props.onTrackRemove?.(index())
            }
            onSelect={() => props.onTrackSelect(index())}
            track={track}
          />
        )}
      </For>
    </ol>
  </Show>
)
