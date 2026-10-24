import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

import {type PResolvedAlbum, type PTrack} from '../../features/focus-room-audio/index'
import * as m from '@paraglide/message'
import {HConfirmButton} from '../h-confirm-button/HConfirmButton'
import {P_BUTTON_CLASSES, PButton} from '../p-button/PButton'
import {CustomAlbumCoverImage} from './CustomAlbumCoverImage'

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
  readonly coverImage?: Blob
  readonly deletingAlbumId?: string | null
  readonly index: number
  readonly onDelete?: () => Promise<void> | void
  readonly onEdit?: () => void
}

export const AlbumSummary = (props: AlbumSummaryProps) => (
  <div class="flex gap-3.5 p-4">
    <Show
      fallback={
        <Show
          fallback={
            <div
              aria-hidden="true"
              class={cx(
                'grid size-16 flex-none place-items-center rounded-4 text-white shadow-panel',
                ALBUM_ART_CLASSES[props.index % ALBUM_ART_CLASSES.length],
              )}
            >
              <span class={`${props.album.icon} size-6.5 opacity-90`} />
            </div>
          }
          when={props.coverImage}
        >
          {(coverImage) => (
            <CustomAlbumCoverImage
              alt={m.album_cover_alt({title: props.album.title})}
              class="size-16 flex-none rounded-4 object-cover shadow-panel"
              coverImage={coverImage()}
            />
          )}
        </Show>
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
      <div class="flex min-w-0 items-start justify-between gap-2">
        <h3 class="m-0 min-w-0 flex-1 truncate text-base font-750 leading-5 text-foreground">
          {props.album.title}
        </h3>
        <Show when={props.onEdit !== undefined || props.onDelete !== undefined}>
          <div class="flex flex-none items-center gap-2">
            <Show when={props.onEdit}>
              <PButton
                bordered
                class="flex-none"
                onPress={() => props.onEdit?.()}
                size="small"
                tone="secondary"
                transparent
              >
                {m.album_custom_edit()}
              </PButton>
            </Show>
            <Show when={props.onDelete}>
              <HConfirmButton
                accessibleLabel={
                  props.deletingAlbumId === props.album.id
                    ? m.album_custom_deleting()
                    : m.album_custom_delete_accessible({title: props.album.title})
                }
                class={P_BUTTON_CLASSES({
                  bordered: true,
                  class: 'flex-none',
                  size: 'small',
                  tone: 'danger',
                  transparent: true,
                })}
                confirmationAccessibleLabel={m.album_custom_delete_confirm_accessible({
                  title: props.album.title,
                })}
                confirmationChildren={m.album_custom_delete_confirm()}
                disabled={props.deletingAlbumId !== null && props.deletingAlbumId !== undefined}
                onConfirm={() => props.onDelete?.()}
              >
                <>
                  <span
                    aria-hidden="true"
                    class={
                      props.deletingAlbumId === props.album.id
                        ? 'i-tabler-loader-2 size-4.5 flex-none animate-spin'
                        : 'i-tabler-trash size-4.5 flex-none'
                    }
                  />
                  {props.deletingAlbumId === props.album.id
                    ? m.album_custom_deleting()
                    : m.album_custom_delete()}
                </>
              </HConfirmButton>
            </Show>
          </div>
        </Show>
      </div>
      <Show when={props.album.description}>
        {(description) => (
          <p class="mb-0 mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {description()}
          </p>
        )}
      </Show>
      <Show when={(props.album.trackCount ?? props.album.tracks.length) > 0}>
        <p class="mb-0 mt-2 flex items-center gap-1.5 text-sm leading-5 text-muted-foreground">
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
