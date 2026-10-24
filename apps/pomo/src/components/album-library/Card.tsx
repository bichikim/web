import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {PButton} from '../p-button/PButton'
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
  readonly customCoverImage?: Blob
  readonly deletingAlbumId?: string | null
  readonly index: number
  readonly isInPlayer: boolean
  readonly onDelete?: () => Promise<void> | void
  readonly onEdit?: () => void
  readonly onAddAlbum: (album: PResolvedAlbum) => void
  readonly onAddTrack: (track: PTrack) => void
  readonly onRemoveTracks?: (trackIds: ReadonlySet<string>) => void
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
      <AlbumSummary
        album={props.album}
        coverImage={props.customCoverImage}
        deletingAlbumId={props.deletingAlbumId}
        index={props.index}
        onDelete={props.onDelete}
        onEdit={props.onEdit}
      />
      <Show when={listedTracks().length > 0}>
        <PAlbumTrackList
          albumTitle={props.album.title}
          onAddTrack={props.onAddTrack}
          onRemoveTracks={props.onRemoveTracks}
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
          class="flex items-center gap-2 border-t border-solid border-border px-4 py-3 text-sm leading-5
            text-muted-foreground"
        >
          <span
            aria-hidden="true"
            class={`${props.onEdit ? 'i-tabler-music-off' : 'i-tabler-clock-hour-4'} size-4 text-highlight`}
          />
          <span>{props.onEdit ? m.album_custom_no_tracks() : m.album_tracks_preparing()}</span>
        </div>
      </Show>
      <Show when={props.album.sale === undefined && props.album.tracks.length > 0}>
        <div class="px-4 pb-4">
          <PButton
            bordered={props.isInPlayer}
            transparent={props.isInPlayer}
            raised={!props.isInPlayer}
            class="w-full"
            disabled={props.isInPlayer && props.onRemoveTracks === undefined}
            icon={props.isInPlayer ? 'i-tabler-playlist-x' : 'i-tabler-playlist-add'}
            onPress={() => {
              if (props.isInPlayer) {
                props.onRemoveTracks?.(new Set(props.album.tracks.map((track) => track.id)))
                return
              }

              props.onAddAlbum(props.album)
            }}
            size="small"
            tone={props.isInPlayer ? 'secondary' : 'primary'}
          >
            {props.isInPlayer
              ? props.onRemoveTracks === undefined
                ? m.album_track_in_player({title: props.album.title})
                : m.album_remove_all()
              : m.album_add_all()}
          </PButton>
        </div>
      </Show>
      <Show when={props.album.sale}>{(sale) => <AlbumSaleStatus sale={sale()} />}</Show>
    </article>
  )
}
