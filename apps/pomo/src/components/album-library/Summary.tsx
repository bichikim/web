import {Show} from 'solid-js'

import {type PResolvedAlbum, type PTrack} from '../../features/focus-room-audio/index'
import * as m from '../../paraglide/messages.js'

const SECONDS_PER_MINUTE = 60

const formatDuration = (tracks: readonly PTrack[]) => {
  const durationSeconds = Math.round(
    tracks.reduce((total, track) => total + track.durationSeconds, 0),
  )
  const minutes = Math.floor(durationSeconds / SECONDS_PER_MINUTE)
  const seconds = durationSeconds % SECONDS_PER_MINUTE

  return m.album_duration({minutes, seconds: seconds.toString().padStart(2, '0')})
}

const ALBUM_ART_CLASSES = [
  [
    'bg-[radial-gradient(circle_at_28%_24%,rgb(255_244_201_/_80%),transparent_28%),',
    'linear-gradient(145deg,#d48c63,#7b493a)]',
  ].join(''),
  [
    'bg-[radial-gradient(circle_at_72%_20%,rgb(255_222_164_/_72%),transparent_30%),',
    'linear-gradient(145deg,#9b9070,#4c5042)]',
  ].join(''),
  [
    'bg-[radial-gradient(circle_at_38%_18%,rgb(213_224_201_/_52%),transparent_26%),',
    'linear-gradient(145deg,#596b62,#242d2b)]',
  ].join(''),
] as const

interface AlbumSummaryProps {
  readonly album: PResolvedAlbum
  readonly index: number
}

export const AlbumSummary = (props: AlbumSummaryProps) => (
  <div class="flex gap-3.5 p-4">
    <Show
      fallback={
        <div
          aria-hidden="true"
          class={[
            'grid size-16 flex-none place-items-center rounded-4 text-white shadow-panel',
            ALBUM_ART_CLASSES[props.index % ALBUM_ART_CLASSES.length],
          ].join(' ')}
        >
          <span class={`${props.album.icon} size-6.5 opacity-90`} />
        </div>
      }
      when={props.album.coverImageUrl}
    >
      {(coverImageUrl) => (
        <img
          alt={m.album_cover_alt({title: props.album.title})}
          class="size-16 flex-none rounded-4 object-cover shadow-panel"
          src={coverImageUrl()}
        />
      )}
    </Show>
    <div class="min-w-0 flex-1 py-0.5">
      <h3 class="m-0 truncate text-base font-750 leading-5 text-foreground">{props.album.title}</h3>
      <p class="mb-0 mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {props.album.description}
      </p>
      <Show when={(props.album.trackCount ?? props.album.tracks.length) > 0}>
        <p class="mb-0 mt-2 flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
          <span aria-hidden="true" class="i-tabler-music size-3.5" />
          <span>
            {m.album_track_count({count: props.album.trackCount ?? props.album.tracks.length})}
          </span>
          <Show when={props.album.tracks.length > 0}>
            <span aria-hidden="true" class="opacity-50">
              ·
            </span>
            <span>{formatDuration(props.album.tracks)}</span>
          </Show>
        </p>
      </Show>
    </div>
  </div>
)
