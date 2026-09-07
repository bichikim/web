import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {type AdminAlbum, getAlbumTranslation} from '../../features/admin-music'
import {AlbumArtwork} from './Artwork'

const STATUS_LABELS = {
  archived: '보관됨',
  draft: '초안',
  published: '공개 중',
} as const

const SETTINGS_BUTTON_CLASSES = cx(
  'min-h-10 rounded-3 border border-white/18 bg-white/5 px-4 text-sm font-700 text-white',
  'transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#e8bc88',
)

export interface AlbumReleaseCardProps {
  readonly album: AdminAlbum
  readonly activeOfferCount?: number
  readonly onPublicSettingsSelect?: () => void
  readonly trackCount?: number
}

export const AlbumReleaseCard = (props: AlbumReleaseCardProps) => (
  <header class="rounded-5 border border-white/10 bg-white/4 p-5 sm:p-6">
    <div class="flex flex-wrap items-center gap-4 sm:gap-5">
      <AlbumArtwork album={props.album} />
      <div class="min-w-0 grow">
        <span
          class={cx(
            'inline-flex rounded-full px-2.5 py-1 text-xs font-750',
            props.album.status === 'published'
              ? 'bg-#6fbd83/14 text-#a8ddb5'
              : 'bg-#e8bc88/12 text-#efc897',
          )}
        >
          {STATUS_LABELS[props.album.status]}
        </span>
        <h2 class="mb-0 mt-2 truncate text-xl font-800 tracking--0.025em sm:text-2xl">
          {getAlbumTranslation(props.album, 'ko')?.title ?? '제목 없음'}
        </h2>
        <p class="mb-0 mt-1 text-sm text-white/50">
          {props.trackCount ?? 0}곡 ·{' '}
          {(props.activeOfferCount ?? 0) > 0 ? '판매 상품 연결됨' : '판매 준비중'}
        </p>
      </div>
      <Show when={props.onPublicSettingsSelect !== undefined}>
        <button
          class={SETTINGS_BUTTON_CLASSES}
          onClick={() => props.onPublicSettingsSelect?.()}
          type="button"
        >
          공개 설정
        </button>
      </Show>
    </div>
  </header>
)
