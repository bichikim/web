import {For, Show} from 'solid-js'

import {BYTES_PER_MEBIBYTE, type CustomAlbumTrack} from '../../features/custom-albums'
import {PButton} from '../p-button/PButton'
import * as m from '@paraglide/message'

const SECONDS_PER_MINUTE = 60

interface CustomAlbumTrackListProps {
  readonly disabled: boolean
  readonly onRemove: (trackId: string) => void
  readonly tracks: readonly CustomAlbumTrack[]
}

const formatDuration = (durationSeconds: number): string =>
  m.album_custom_track_duration({
    minutes: Math.floor(durationSeconds / SECONDS_PER_MINUTE),
    seconds: (durationSeconds % SECONDS_PER_MINUTE).toString().padStart(2, '0'),
  })

const formatBytes = (bytes: number): string => `${(bytes / BYTES_PER_MEBIBYTE).toFixed(1)} MB`

export const CustomAlbumTrackList = (props: CustomAlbumTrackListProps) => (
  <Show
    fallback={
      <p class="m-0 rounded-control border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">
        {m.album_custom_no_tracks()}
      </p>
    }
    when={props.tracks.length > 0}
  >
    <ul class="m-0 grid max-h-56 list-none gap-2 overflow-y-auto p-0">
      <For each={props.tracks}>
        {(track, index) => (
          <li class="flex min-w-0 items-center justify-between gap-3 rounded-control bg-content-surface px-3 py-2">
            <div class="min-w-0">
              <p class="m-0 truncate text-sm font-650 leading-5 text-foreground">
                {index() + 1}. {track.title}
              </p>
              <p class="mb-0 mt-1 text-xs leading-4 text-muted-foreground">
                {formatDuration(track.durationSeconds)} · {formatBytes(track.audio.size)}
              </p>
            </div>
            <PButton
              aria-label={m.album_custom_remove_track({title: track.title})}
              disabled={props.disabled}
              icon="i-tabler-trash"
              onPress={() => props.onRemove(track.id)}
              size="small"
              tone="danger"
              transparent
              type="button"
            >
              {m.album_custom_remove()}
            </PButton>
          </li>
        )}
      </For>
    </ul>
  </Show>
)
