import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'
import {type AdminAlbum, getAlbumTranslation} from '../../features/admin-music'

interface AlbumNavigationProps {
  readonly albums: ReadonlyArray<AdminAlbum>
  readonly onAlbumSelect: (albumId: string) => void
  readonly selectedAlbumId: string | null
  readonly trackCount: (albumId: string) => number
}

export const AlbumNavigation = (props: AlbumNavigationProps) => (
  <nav aria-label="등록된 앨범" class="rounded-5 border border-white/10 bg-white/3 p-3">
    <div class="flex items-baseline justify-between gap-3 px-2 py-2">
      <h2 class="m-0 text-sm font-750">등록된 앨범</h2>
      <span class="text-xs text-white/40">{props.albums.length}개</span>
    </div>
    <div class="mt-2 grid gap-1">
      <For each={props.albums}>
        {(album) => {
          const translation = () => getAlbumTranslation(album, 'ko')
          const isSelected = () => props.selectedAlbumId === album.id

          return (
            <button
              aria-pressed={isSelected()}
              class={cx(
                'flex w-full items-center gap-3 rounded-4 border px-3 py-3 text-left transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-#e8bc88',
                isSelected()
                  ? 'border-#e8bc88/45 bg-#e8bc88/10'
                  : 'border-transparent hover:border-white/10 hover:bg-white/5',
              )}
              onClick={() => props.onAlbumSelect(album.id)}
              type="button"
            >
              <span
                class={cx(
                  'grid size-10 shrink-0 place-items-center overflow-hidden rounded-3 bg-black/20',
                  'text-xs font-800 text-#e8bc88',
                )}
              >
                <Show
                  fallback={
                    album.coverFallback === 'music' ? '♪' : album.coverFallback.toUpperCase()
                  }
                  when={album.coverImageUrl}
                >
                  {(coverImageUrl) => (
                    <img alt="" class="size-full object-cover" src={coverImageUrl()} />
                  )}
                </Show>
              </span>
              <span class="min-w-0 grow">
                <span class="block truncate text-sm font-750">
                  {translation()?.title ?? '제목 없음'}
                </span>
                <span class="mt-1 flex items-center gap-2 text-xs">
                  <span class={album.status === 'published' ? 'text-#99d6aa' : 'text-#f2bd85'}>
                    {album.status === 'published'
                      ? '공개'
                      : album.status === 'archived'
                        ? '보관'
                        : '초안'}
                  </span>
                  <span class="text-white/25">·</span>
                  <span class="text-white/45">{props.trackCount(album.id)}곡</span>
                </span>
              </span>
            </button>
          )
        }}
      </For>
    </div>
  </nav>
)
