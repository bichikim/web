import {Show} from 'solid-js'
import {type PAlbumSale} from '../../features/focus-room-audio/index'

interface AlbumSaleStatusProps {
  readonly sale: PAlbumSale
}

export const AlbumSaleStatus = (props: AlbumSaleStatusProps) => (
  <div class="flex items-center justify-between gap-3 border-t border-solid border-border px-4 py-3">
    <Show when={props.sale.priceLabel}>
      {(priceLabel) => <span class="text-sm font-750 text-foreground">{priceLabel()}</span>}
    </Show>
    <span class="ml-auto text-xs font-700 text-highlight">{props.sale.statusLabel}</span>
  </div>
)
