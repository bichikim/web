import {Show} from 'solid-js'

import {PButton} from '../../design-system/PButton'
import {
  type PAlbumSale,
  type PResolvedAlbum,
  type PTrack,
  type PTrackListing,
  type PTrackPreviewRequest,
} from '../../features/focus-room-audio/index'
import {PAlbumTrackList} from '../PAlbumTrackList'
import * as m from '../../paraglide/messages.js'
import {AlbumSummary} from './Summary'

const ALBUM_CARD_CLASSES = [
  'overflow-hidden rounded-panel-inner border border-solid border-border',
  'bg-surface-interactive',
] as const

interface AlbumSaleStatusProps {
  readonly sale: PAlbumSale
}

const AlbumSaleStatus = (props: AlbumSaleStatusProps) => (
  <div class="flex items-center justify-between gap-3 border-t border-solid border-border px-4 py-3">
    <Show when={props.sale.priceLabel}>
      {(priceLabel) => <span class="text-sm font-750 text-foreground">{priceLabel()}</span>}
    </Show>
    <span class="ml-auto text-xs font-700 text-highlight">{props.sale.statusLabel}</span>
  </div>
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

export const AlbumCard = (props: AlbumCardProps) => {
  const listedTracks = (): readonly PTrackListing[] =>
    props.album.trackListings ?? props.album.tracks

  return (
    <article class={ALBUM_CARD_CLASSES.join(' ')}>
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
