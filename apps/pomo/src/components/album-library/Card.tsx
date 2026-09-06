import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {PButton} from '../PButton'
import {
  type PResolvedAlbum,
  type PTrack,
  type PTrackListing,
  type PTrackPreviewRequest,
} from '../../features/focus-room-audio/index'
import {PAlbumTrackList} from './TrackList'
import * as m from '@paraglide/message'
import {AlbumSummary} from './Summary'
import {AlbumSaleStatus} from './SaleStatus'

const ALBUM_CARD_CLASSES = cx(
  'overflow-hidden rounded-panel-inner border border-solid border-border',
  'bg-surface-interactive',
)

interface AlbumCardProps {
  readonly album: PResolvedAlbum
  readonly index: number
  readonly isInPlayer: boolean
  readonly onAddAlbum: (album: PResolvedAlbum) => void
  readonly onAddTrack: (track: PTrack) => void
  readonly onPreview: (request: PTrackPreviewRequest) => void
  readonly pendingTrackId: string | null
  readonly playingTrackId: string | null
  readonly trackIds: ReadonlySet<string>
}

/**
 * 앨범 라이브러리에서 앨범 정보와 트랙 목록, 미리듣기·플레이어 추가 UI를 표시한다.
 * 판매 정보가 있으면 전체 추가 버튼 대신 가격과 판매 상태를 표시한다.
 * 실제 미리듣기와 플레이어 추가 처리는 전달받은 콜백에 맡긴다.
 */
export const AlbumCard = (props: AlbumCardProps) => {
  const listedTracks = (): readonly PTrackListing[] =>
    props.album.trackListings ?? props.album.tracks

  return (
    <article class={ALBUM_CARD_CLASSES}>
      <AlbumSummary album={props.album} index={props.index} />
      <Show when={listedTracks().length > 0}>
        <PAlbumTrackList
          albumTitle={props.album.title}
          onAddTrack={props.onAddTrack}
          onPreview={props.onPreview}
          pendingTrackId={props.pendingTrackId}
          playableTracks={props.album.sale === undefined ? props.album.tracks : []}
          playingTrackId={props.playingTrackId}
          trackIds={props.trackIds}
          tracks={listedTracks()}
        />
      </Show>
      <Show when={props.album.sale === undefined && props.album.tracks.length === 0}>
        <div
          class="flex items-center gap-2 border-t border-solid border-border px-4 py-3 text-xs
            text-muted-foreground"
        >
          <span aria-hidden="true" class="i-tabler-clock-hour-4 size-4 text-highlight" />
          <span>{m.album_tracks_preparing()}</span>
        </div>
      </Show>
      <Show when={props.album.sale === undefined && props.album.tracks.length > 0}>
        <div class="px-4 pb-4">
          <PButton
            class="w-full"
            disabled={props.isInPlayer}
            icon="i-tabler-playlist-add"
            onPress={() => props.onAddAlbum(props.album)}
            size="small"
            tone={props.isInPlayer ? 'secondary' : 'primary'}
          >
            {m.album_add_all()}
          </PButton>
        </div>
      </Show>
      <Show when={props.album.sale}>{(sale) => <AlbumSaleStatus sale={sale()} />}</Show>
    </article>
  )
}
