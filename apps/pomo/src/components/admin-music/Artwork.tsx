import {cx} from 'class-variance-authority'
import {createEffect, createSignal, on, Show} from 'solid-js'
import {type AdminAlbum, getAlbumTranslation} from '../../features/admin-music'

const ARTWORK_CLASSES = cx(
  'grid size-20 shrink-0 place-items-center overflow-hidden rounded-4 border',
  'border-white/15 bg-#27211c text-sm font-800 text-#e8bc88 sm:size-24',
)

interface AlbumArtworkProps {
  readonly album: AdminAlbum
}

export const AlbumArtwork = (props: AlbumArtworkProps) => {
  const [didImageFail, setDidImageFail] = createSignal(false)

  createEffect(
    on(
      () => props.album.coverImageUrl,
      (coverImageUrl, previousUrl) => {
        if (coverImageUrl !== previousUrl) {
          setDidImageFail(false)
        }
      },
    ),
  )

  return (
    <div class={ARTWORK_CLASSES}>
      <Show
        fallback={
          <span aria-label={`${props.album.coverFallback} 기본 커버`}>
            {props.album.coverFallback === 'music' ? '♪' : props.album.coverFallback.toUpperCase()}
          </span>
        }
        when={didImageFail() ? null : props.album.coverImageUrl}
      >
        {(coverImageUrl) => (
          <img
            alt={`${getAlbumTranslation(props.album, 'ko')?.title ?? '제목 없는'} 앨범 커버`}
            class="size-full object-cover"
            onError={() => setDidImageFail(true)}
            src={coverImageUrl()}
          />
        )}
      </Show>
    </div>
  )
}
