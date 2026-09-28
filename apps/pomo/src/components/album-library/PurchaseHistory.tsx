import {getLocale} from '@paraglide/runtime'
import * as m from '@paraglide/message'
import {For, Show} from 'solid-js'

import {formatMinorAmount, type PaymentOrderHistoryView} from '../../features/payment'
import type {PResolvedAlbum} from '../../features/focus-room-audio'

interface PurchaseHistoryProps {
  readonly albums: readonly PResolvedAlbum[]
  readonly orders: readonly PaymentOrderHistoryView[]
}

const getStatusLabel = (order: PaymentOrderHistoryView): string => {
  if (order.entitlementStatus === 'granted') {
    return order.status === 'partially_refunded'
      ? m.album_purchase_history_partially_refunded()
      : m.album_purchase_history_paid()
  }

  switch (order.status) {
    case 'canceled':
      return m.album_purchase_history_canceled()
    case 'failed':
      return m.album_purchase_history_failed()
    case 'refunded':
      return m.album_purchase_history_refunded()
    case 'partially_refunded':
      return m.album_purchase_history_partially_refunded()
    case 'paid':
    case 'pending':
      return m.album_purchase_history_pending()
  }
}

export const PurchaseHistory = (props: PurchaseHistoryProps) => (
  <Show when={props.orders.length > 0}>
    <section
      aria-labelledby="album-purchase-history"
      class="mt-5 rounded-control border border-solid border-border p-4"
    >
      <h3 class="m-0 text-base font-750" id="album-purchase-history">
        {m.album_purchase_history_title()}
      </h3>
      <div class="mt-3 grid gap-2">
        <For each={props.orders}>
          {(order) => {
            const album = () =>
              props.albums.find((candidate) => candidate.productId === order.productId)
            const purchaseDate = () =>
              new Intl.DateTimeFormat(getLocale(), {dateStyle: 'medium'}).format(
                new Date(order.paidAt ?? order.createdAt),
              )

            return (
              <article class="rounded-control border border-solid border-border bg-content-surface px-3 py-3">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="m-0 truncate text-sm font-700">
                      {album()?.title ?? m.album_purchase_history_unknown_album()}
                    </p>
                    <p class="mb-0 mt-1 text-xs text-muted-foreground">{purchaseDate()}</p>
                  </div>
                  <span class="text-sm font-750 text-foreground">
                    {formatMinorAmount({
                      amountMinor: order.amountMinor,
                      currency: order.currency,
                      fractionalDigits: order.fractionalDigits,
                      locale: getLocale(),
                    })}
                  </span>
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{getStatusLabel(order)}</span>
                  <Show when={order.receiptUrl}>
                    {(receiptUrl) => (
                      <a href={receiptUrl()} rel="noreferrer" target="_blank">
                        {m.album_purchase_receipt()}
                      </a>
                    )}
                  </Show>
                </div>
              </article>
            )
          }}
        </For>
      </div>
    </section>
  </Show>
)
