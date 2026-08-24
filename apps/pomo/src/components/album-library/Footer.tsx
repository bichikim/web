import {Show} from 'solid-js'

import * as m from '../../paraglide/messages.js'

interface PlaylistFooterProps {
  readonly canClear: boolean
  readonly clearedTrackCount: number
  readonly onClear: () => void
  readonly onRestore: () => void
  readonly trackCount: number
}

export const PlaylistFooter = (props: PlaylistFooterProps) => (
  <Show when={props.canClear && (props.trackCount > 0 || props.clearedTrackCount > 0)}>
    <Show
      fallback={
        <div class="flex min-h-11 items-center justify-between gap-4">
          <span class="text-sm text-muted-foreground">
            {m.album_playlist_current()}{' '}
            <strong class="font-750 text-foreground">
              {m.album_track_count({count: props.trackCount})}
            </strong>
          </span>
          <button
            aria-label={m.album_playlist_clear_all()}
            class="min-h-11 cursor-pointer rounded-control border-0 bg-transparent px-3 text-sm
              font-700 text-muted-foreground outline-none transition-colors hover:bg-danger/10
              hover:text-danger focus-visible:shadow-focus motion-reduce:transition-none"
            onClick={() => props.onClear()}
            type="button"
          >
            {m.album_playlist_clear()}
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
        <span class="text-sm text-muted-foreground">{m.album_playlist_cleared()}</span>
        <button
          class="min-h-11 cursor-pointer rounded-control border-0 bg-transparent px-3 text-sm
            font-750 text-highlight outline-none transition-colors hover:bg-surface
            focus-visible:shadow-focus motion-reduce:transition-none"
          onClick={() => props.onRestore()}
          type="button"
        >
          {m.album_playlist_restore()}
        </button>
      </div>
    </Show>
  </Show>
)
